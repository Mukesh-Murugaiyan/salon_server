const request = require('supertest');
const app = require('../src/app');
const { setupTestDB } = require('./setup');
const { User, ROLES } = require('../src/models/user.model');
const Salon = require('../src/models/salon.model');
const { signToken } = require('../src/utils/jwt');
const { hashPassword } = require('../src/utils/password');

setupTestDB();

describe('User Module API Tests (Modular Routes & Services)', () => {
  let salonA;
  let salonB;
  let adminToken;
  let ownerAToken;
  let receptionistAToken;
  let userA1;
  let userB1;

  beforeEach(async () => {
    // Create two test salons
    salonA = await Salon.create({ name: 'Salon A', email: 'a@salon.com' });
    salonB = await Salon.create({ name: 'Salon B', email: 'b@salon.com' });

    const passwordHash = await hashPassword('Password@123');

    // Admin
    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@platform.com',
      passwordHash,
      role: ROLES.SUPER_ADMIN.value,
      salonId: null,
      isActive: true,
    });
    adminToken = signToken({ userId: admin._id.toString(), role: admin.role, salonId: null });

    // Owner of Salon A
    const ownerA = await User.create({
      name: 'Owner A',
      email: 'ownerA@salona.com',
      passwordHash,
      role: ROLES.OWNER.value,
      salonId: salonA._id,
      isActive: true,
    });
    ownerAToken = signToken({ userId: ownerA._id.toString(), role: ownerA.role, salonId: salonA._id.toString() });

    // Receptionist in Salon A
    userA1 = await User.create({
      name: 'Receptionist A1',
      email: 'recA1@salona.com',
      passwordHash,
      role: ROLES.RECEPTIONIST.value,
      salonId: salonA._id,
      isActive: true,
    });
    receptionistAToken = signToken({
      userId: userA1._id.toString(),
      role: userA1.role,
      salonId: salonA._id.toString(),
    });

    // User in Salon B
    userB1 = await User.create({
      name: 'Receptionist B1',
      email: 'recB1@salonb.com',
      passwordHash,
      role: ROLES.RECEPTIONIST.value,
      salonId: salonB._id,
      isActive: true,
    });
  });

  describe('GET /api/users (Tenant Isolation)', () => {
    it('OWNER only sees users belonging strictly to their salon (Salon A)', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${ownerAToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);

      // Should include Owner A and Receptionist A1, but NOT Receptionist B1
      const emails = res.body.users.map((u) => u.email);
      expect(emails).toContain('ownerA@salona.com');
      expect(emails).toContain('recA1@salona.com');
      expect(emails).not.toContain('recB1@salonb.com');
    });

    it('SUPER_ADMIN can see all users across all tenants', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const emails = res.body.users.map((u) => u.email);
      expect(emails).toContain('admin@platform.com');
      expect(emails).toContain('ownerA@salona.com');
      expect(emails).toContain('recB1@salonb.com');
    });
  });

  describe('GET /api/users/:id (Tenant Boundary)', () => {
    it('OWNER can view staff user within their salon', async () => {
      const res = await request(app)
        .get(`/api/users/${userA1._id}`)
        .set('Authorization', `Bearer ${ownerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('recA1@salona.com');
    });

    it('OWNER is rejected with 403 when trying to view user from another salon', async () => {
      const res = await request(app)
        .get(`/api/users/${userB1._id}`)
        .set('Authorization', `Bearer ${ownerAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/users (Staff Provisioning)', () => {
    it('OWNER can provision new RECEPTIONIST, automatically assigned to their salon', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          name: 'New Receptionist',
          email: 'newrec@salona.com',
          password: 'Password@123',
          role: 'RECEPTIONIST',
          salonId: salonB._id.toString(), // Attacker attempt: trying to assign to Salon B
        });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('newrec@salona.com');
      // Must be assigned to Salon A (the owner's salon), ignoring the body salonId
      expect(res.body.user.salonId).toBe(salonA._id.toString());
      expect(res.body.user.salonId).not.toBe(salonB._id.toString());
    });

    it('OWNER is forbidden from creating a SUPER_ADMIN', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          name: 'Fake Admin',
          email: 'fakeadmin@test.com',
          password: 'Password@123',
          role: 'SUPER_ADMIN',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('RECEPTIONIST is forbidden from creating users with 403', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${receptionistAToken}`)
        .send({
          name: 'Staff',
          email: 'staff@test.com',
          password: 'Password@123',
          role: 'RECEPTIONIST',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });
  });

  describe('PATCH /api/users/:id/status (Toggle Account Status)', () => {
    it('OWNER can disable and enable staff account', async () => {
      const res = await request(app)
        .patch(`/api/users/${userA1._id}/status`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);

      // Verify in DB
      const updatedUser = await User.findById(userA1._id);
      expect(updatedUser.isActive).toBe(false);
    });
  });
});
