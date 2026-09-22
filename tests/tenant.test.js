const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { setupTestDB } = require('./setup');
const { authenticate } = require('../src/middleware/auth.middleware');
const { getSalonIdFromUser } = require('../src/utils/tenant');
const { errorHandler } = require('../src/middleware/error.middleware');
const { User, ROLES } = require('../src/models/user.model');
const Salon = require('../src/models/salon.model');
const { signToken } = require('../src/utils/jwt');
const { hashPassword } = require('../src/utils/password');

setupTestDB();

describe('Tenant Isolation & getSalonIdFromUser Tests', () => {
  let app;
  let salonA;
  let salonB;
  let ownerA;
  let receptionistA;
  let admin;
  let ownerAToken;
  let receptionistAToken;
  let adminToken;

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    // Simulated tenant-scoped endpoint that retrieves the active tenant ID
    app.post('/api/test/tenant-data', authenticate, (req, res) => {
      // Secure tenant extraction rule: ALWAYS use getSalonIdFromUser(req) or req.user.salonId
      const authoritativeSalonId = getSalonIdFromUser(req);

      res.status(200).json({
        effectiveSalonId: authoritativeSalonId,
        receivedBodySalonId: req.body.salonId || null,
        userRole: req.user.role,
      });
    });

    app.use(errorHandler);

    // Create two separate salons (tenants)
    salonA = await Salon.create({ name: 'Salon A - Luxe', email: 'a@salon.com' });
    salonB = await Salon.create({ name: 'Salon B - Glam', email: 'b@salon.com' });

    const hashedPassword = await hashPassword('Password@123');

    // Owner and receptionist belonging to Salon A
    ownerA = await User.create({
      name: 'Owner A',
      email: 'ownerA@saloncrm.com',
      passwordHash: hashedPassword,
      role: ROLES.OWNER.value,
      salonId: salonA._id,
      isActive: true,
    });
    ownerAToken = signToken({
      userId: ownerA._id.toString(),
      role: ownerA.role,
      salonId: salonA._id.toString(),
    });

    receptionistA = await User.create({
      name: 'Receptionist A',
      email: 'receptionistA@saloncrm.com',
      passwordHash: hashedPassword,
      role: ROLES.RECEPTIONIST.value,
      salonId: salonA._id,
      isActive: true,
    });
    receptionistAToken = signToken({
      userId: receptionistA._id.toString(),
      role: receptionistA.role,
      salonId: salonA._id.toString(),
    });

    // Super Admin with null salonId
    admin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@saloncrm.com',
      passwordHash: hashedPassword,
      role: ROLES.SUPER_ADMIN.value,
      salonId: null,
      isActive: true,
    });
    adminToken = signToken({
      userId: admin._id.toString(),
      role: admin.role,
      salonId: null,
    });
  });

  it('CRITICAL SECURITY: Owner request with spoofed salonId in body must strictly resolve to authenticated salonId', async () => {
    // Authenticated OWNER belongs to SALON_A
    // Attempt to spoof/switch tenant to SALON_B via request body
    const spoofedSalonId = salonB._id.toString();

    const res = await request(app)
      .post('/api/test/tenant-data')
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        salonId: spoofedSalonId, // ATTACK: attempting to query/manipulate Salon B
        dummyPayload: 'Malicious modification',
      });

    expect(res.status).toBe(200);
    // The authoritative salonId MUST be Salon A, never the spoofed Salon B
    expect(res.body.effectiveSalonId).toBe(salonA._id.toString());
    expect(res.body.effectiveSalonId).not.toBe(spoofedSalonId);
    expect(res.body.receivedBodySalonId).toBe(spoofedSalonId);
  });

  it('CRITICAL SECURITY: Receptionist request must strictly resolve to authenticated salonId and ignore query/body tampering', async () => {
    const forgedId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .post(`/api/test/tenant-data?salonId=${forgedId}`)
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .send({ salonId: forgedId });

    expect(res.status).toBe(200);
    expect(res.body.effectiveSalonId).toBe(salonA._id.toString());
    expect(res.body.effectiveSalonId).not.toBe(forgedId);
  });

  it('SUPER_ADMIN request should return null salonId from getSalonIdFromUser', async () => {
    const res = await request(app)
      .post('/api/test/tenant-data')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.effectiveSalonId).toBeNull();
  });
});
