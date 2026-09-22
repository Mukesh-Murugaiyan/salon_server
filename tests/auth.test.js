const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const env = require('../src/config/env');
const { setupTestDB } = require('./setup');
const { User, ROLES } = require('../src/models/user.model');
const Salon = require('../src/models/salon.model');
const { hashPassword } = require('../src/utils/password');

setupTestDB();

describe('Authentication API & JWT Tests', () => {
  let demoSalon;
  let adminUser;
  let ownerUser;
  let receptionistUser;
  let disabledUser;

  beforeEach(async () => {
    // Create demo salon
    demoSalon = await Salon.create({
      name: 'Test Salon',
      email: 'salon@test.com',
      phone: '1234567890',
    });

    const hashedPassword = await hashPassword('Password@123');

    adminUser = await User.create({
      name: 'Super Admin',
      email: 'admin@saloncrm.com',
      passwordHash: hashedPassword,
      role: ROLES.SUPER_ADMIN.value,
      salonId: null,
      isActive: true,
    });

    ownerUser = await User.create({
      name: 'Salon Owner',
      email: 'owner@saloncrm.com',
      passwordHash: hashedPassword,
      role: ROLES.OWNER.value,
      salonId: demoSalon._id,
      isActive: true,
    });

    receptionistUser = await User.create({
      name: 'Salon Receptionist',
      email: 'receptionist@saloncrm.com',
      passwordHash: hashedPassword,
      role: ROLES.RECEPTIONIST.value,
      salonId: demoSalon._id,
      isActive: true,
    });

    disabledUser = await User.create({
      name: 'Disabled User',
      email: 'disabled@saloncrm.com',
      passwordHash: hashedPassword,
      role: ROLES.OWNER.value,
      salonId: demoSalon._id,
      isActive: false,
    });
  });

  describe('GET /api/health', () => {
    it('should return 200 with status ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should successfully log in SUPER_ADMIN and return safe user with null salonId', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@saloncrm.com', password: 'Password@123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toEqual({
        id: adminUser._id.toString(),
        name: 'Super Admin',
        email: 'admin@saloncrm.com',
        role: 'SUPER_ADMIN',
        salonId: null,
      });

      // Verify JWT payload does not leak sensitive information
      const decoded = jwt.verify(res.body.token, env.JWT_SECRET);
      expect(decoded.userId).toBe(adminUser._id.toString());
      expect(decoded.role).toBe('SUPER_ADMIN');
      expect(decoded.salonId).toBeNull();
      expect(decoded.passwordHash).toBeUndefined();
      expect(decoded.password).toBeUndefined();
    });

    it('should successfully log in OWNER and return correct salonId', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'owner@saloncrm.com', password: 'Password@123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('OWNER');
      expect(res.body.user.salonId).toBe(demoSalon._id.toString());
    });

    it('should successfully log in RECEPTIONIST', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'receptionist@saloncrm.com', password: 'Password@123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('RECEPTIONIST');
    });

    it('should normalize email with uppercase letters and spaces', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: '  Owner@SalonCRM.COM  ', password: 'Password@123' });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('owner@saloncrm.com');
    });

    it('should reject missing email with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'Password@123' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'VALIDATION_ERROR',
        message: 'Email and password are required.',
      });
    });

    it('should reject missing password with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'owner@saloncrm.com' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'VALIDATION_ERROR',
        message: 'Email and password are required.',
      });
    });

    it('should reject invalid email format with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'Password@123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject unknown email with 401 INVALID_CREDENTIALS (no account enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@saloncrm.com', password: 'Password@123' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    });

    it('should reject wrong password with 401 INVALID_CREDENTIALS', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'owner@saloncrm.com', password: 'WrongPassword@999' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    });

    it('should reject disabled user with 403 ACCOUNT_DISABLED', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'disabled@saloncrm.com', password: 'Password@123' });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: 'ACCOUNT_DISABLED',
        message: 'Your account is disabled. Please contact the administrator.',
      });
    });
  });

  describe('GET /api/auth/me (Protected)', () => {
    it('should reject request without Authorization header with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    });

    it('should reject request with malformed/invalid token with 401 INVALID_TOKEN', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-garbage-token');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token.',
      });
    });

    it('should reject request with expired token with 401 INVALID_TOKEN', async () => {
      const expiredToken = jwt.sign(
        { userId: ownerUser._id.toString(), role: ownerUser.role, salonId: demoSalon._id.toString() },
        env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token.',
      });
    });

    it('should succeed with valid token and return current user without passwordHash', async () => {
      const token = jwt.sign(
        { userId: ownerUser._id.toString(), role: ownerUser.role, salonId: demoSalon._id.toString() },
        env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({
        id: ownerUser._id.toString(),
        name: 'Salon Owner',
        email: 'owner@saloncrm.com',
        role: 'OWNER',
        salonId: demoSalon._id.toString(),
      });
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('should reject request if user was deleted after token was generated', async () => {
      const token = jwt.sign(
        { userId: ownerUser._id.toString(), role: ownerUser.role, salonId: demoSalon._id.toString() },
        env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      // Delete user from database
      await User.findByIdAndDelete(ownerUser._id);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('INVALID_TOKEN');
    });

    it('should reject request if user was disabled after token was generated', async () => {
      const token = jwt.sign(
        { userId: ownerUser._id.toString(), role: ownerUser.role, salonId: demoSalon._id.toString() },
        env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      // Disable user in database
      await User.findByIdAndUpdate(ownerUser._id, { isActive: false });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: 'ACCOUNT_DISABLED',
        message: 'Your account is disabled. Please contact the administrator.',
      });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 200 when calling logout with valid token', async () => {
      const token = jwt.sign(
        { userId: ownerUser._id.toString(), role: ownerUser.role, salonId: demoSalon._id.toString() },
        env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Logged out successfully.' });
    });
  });
});
