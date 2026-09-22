const request = require('supertest');
const express = require('express');
const { setupTestDB } = require('./setup');
const { authenticate } = require('../src/middleware/auth.middleware');
const { authorizeRoles } = require('../src/middleware/role.middleware');
const { errorHandler } = require('../src/middleware/error.middleware');
const { User, ROLES } = require('../src/models/user.model');
const Salon = require('../src/models/salon.model');
const { signToken } = require('../src/utils/jwt');
const { hashPassword } = require('../src/utils/password');

setupTestDB();

describe('Role-Based Access Control (RBAC) Middleware Tests', () => {
  let app;
  let demoSalon;
  let adminToken;
  let ownerToken;
  let receptionistToken;

  beforeEach(async () => {
    // Setup Express test app with mock endpoints testing the RBAC matrix
    app = express();
    app.use(express.json());

    // Super-admin only route (e.g., Plans / Salons)
    app.get(
      '/api/test/super-admin-only',
      authenticate,
      authorizeRoles(ROLES.SUPER_ADMIN),
      (req, res) => {
        res.json({ message: 'Welcome Super Admin' });
      }
    );

    // Owner and Super Admin route (e.g., Subscription management/view)
    app.get(
      '/api/test/subscriptions',
      authenticate,
      authorizeRoles(ROLES.SUPER_ADMIN, ROLES.OWNER),
      (req, res) => {
        res.json({ message: 'Subscriptions accessed' });
      }
    );

    // All roles route (e.g., Appointments / Clients)
    app.get(
      '/api/test/appointments',
      authenticate,
      authorizeRoles(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.RECEPTIONIST),
      (req, res) => {
        res.json({ message: 'Appointments accessed' });
      }
    );

    app.use(errorHandler);

    // Create DB entities
    demoSalon = await Salon.create({ name: 'Luxe Salon', email: 'luxe@test.com' });
    const hashedPassword = await hashPassword('Secret@123');

    const admin = await User.create({
      name: 'Admin',
      email: 'admin@test.com',
      passwordHash: hashedPassword,
      role: ROLES.SUPER_ADMIN.value,
      salonId: null,
      isActive: true,
    });
    adminToken = signToken({ userId: admin._id.toString(), role: admin.role, salonId: null });

    const owner = await User.create({
      name: 'Owner',
      email: 'owner@test.com',
      passwordHash: hashedPassword,
      role: ROLES.OWNER.value,
      salonId: demoSalon._id,
      isActive: true,
    });
    ownerToken = signToken({ userId: owner._id.toString(), role: owner.role, salonId: demoSalon._id.toString() });

    const receptionist = await User.create({
      name: 'Receptionist',
      email: 'receptionist@test.com',
      passwordHash: hashedPassword,
      role: ROLES.RECEPTIONIST.value,
      salonId: demoSalon._id,
      isActive: true,
    });
    receptionistToken = signToken({
      userId: receptionist._id.toString(),
      role: receptionist.role,
      salonId: demoSalon._id.toString(),
    });
  });

  describe('Super Admin restricted routes', () => {
    it('should allow SUPER_ADMIN access', async () => {
      const res = await request(app)
        .get('/api/test/super-admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Welcome Super Admin');
    });

    it('should deny OWNER access with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/test/super-admin-only')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.',
      });
    });

    it('should deny RECEPTIONIST access with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/test/super-admin-only')
        .set('Authorization', `Bearer ${receptionistToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.',
      });
    });
  });

  describe('Subscription routes (SUPER_ADMIN and OWNER allowed, RECEPTIONIST denied)', () => {
    it('should allow SUPER_ADMIN to access subscriptions', async () => {
      const res = await request(app)
        .get('/api/test/subscriptions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should allow OWNER to access subscriptions', async () => {
      const res = await request(app)
        .get('/api/test/subscriptions')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
    });

    it('should DENY RECEPTIONIST from accessing subscriptions with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/test/subscriptions')
        .set('Authorization', `Bearer ${receptionistToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.',
      });
    });
  });

  describe('Shared appointment routes', () => {
    it('should allow all three roles to access appointments', async () => {
      for (const token of [adminToken, ownerToken, receptionistToken]) {
        const res = await request(app)
          .get('/api/test/appointments')
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
      }
    });

    it('should deny unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/test/appointments');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
    });
  });
});
