const request = require('supertest');
const app = require('../src/app');
const { setupTestDB } = require('./setup');
const { User } = require('../src/models/user.model');
const Salon = require('../src/models/salon.model');
const Role = require('../src/models/role.model');
const Attendance = require('../src/models/attendance.model');
const { signToken } = require('../src/utils/jwt');
const { hashPassword } = require('../src/utils/password');
const NumberUtils = require('../src/utils/NumberUtils');

setupTestDB();

describe('Geo-Fencing & Employee Check-In Senior Verification Tests', () => {
  let salon;
  let salonWithoutLocation;
  let staffToken;
  let staffUser;
  let role;

  // Salon location coordinates: Connaught Place, New Delhi
  const SALON_LAT = 28.6315;
  const SALON_LON = 77.2167;
  const ALLOWED_RADIUS = 100; // 100 meters

  beforeEach(async () => {
    // 1. Create configured Salon with known geo-location and allowed radius
    salon = await Salon.create({
      name: 'Elite Salon & Spa',
      code: 'ELITE01',
      email: 'elite@salon.com',
      latitude: String(SALON_LAT),
      longitude: String(SALON_LON),
      allowedRadiusInMeters: ALLOWED_RADIUS,
    });

    // 2. Create a Salon without location configured
    salonWithoutLocation = await Salon.create({
      name: 'Unconfigured Salon',
      code: 'UNCONF01',
      email: 'unconfigured@salon.com',
      latitude: null,
      longitude: null,
      allowedRadiusInMeters: 100,
    });

    // 3. Create role with attendance:check_in permission
    role = await Role.create({
      name: 'Staff Specialist',
      code: 'STAFF',
      salonId: salon._id,
      permissions: ['attendance:check_in', 'attendance:view'],
    });

    // 4. Create user
    const passwordHash = await hashPassword('Password@123');
    staffUser = await User.create({
      name: 'Priya Stylist',
      email: 'priya@salon.com',
      passwordHash,
      roleId: role._id,
      salonId: salon._id,
      isActive: true,
    });

    staffToken = signToken({
      userId: staffUser._id.toString(),
      role: 'STAFF',
      roleId: role._id.toString(),
      salonId: salon._id.toString(),
    });
  });

  describe('1. Positive Use Cases: Inside Radius and Boundaries', () => {
    it('allows check-in when user is at the exact salon location (distance = 0m)', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          latitude: SALON_LAT,
          longitude: SALON_LON,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.attendance).toBeDefined();
      expect(res.body.attendance.status).toBe('PRESENT');
      expect(res.body.attendance.distanceFromSalon).toBe(0);

      // Verify record is created in the database
      const count = await Attendance.countDocuments({ salonId: salon._id, userId: staffUser._id });
      expect(count).toBe(1);
    });

    it('allows check-in when user is inside the radius (e.g. ~40m away)', async () => {
      // 0.00035 degrees latitude is roughly 38.9 meters
      const userLat = SALON_LAT + 0.00035;
      const userLon = SALON_LON;

      const calculatedDistance = NumberUtils.calculateDistance(SALON_LAT, SALON_LON, userLat, userLon);
      expect(calculatedDistance).toBeLessThan(ALLOWED_RADIUS);

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          latitude: userLat,
          longitude: userLon,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.attendance.distanceFromSalon).toBeCloseTo(calculatedDistance, 1);

      // Verified in DB
      const record = await Attendance.findOne({ salonId: salon._id, userId: staffUser._id });
      expect(record).toBeTruthy();
      expect(record.distanceFromSalon).toBeCloseTo(calculatedDistance, 1);
    });

    it('allows check-in at the boundary threshold (slightly inside: ~95m)', async () => {
      // ~95 meters offset in latitude (~0.00085 degrees)
      const userLat = SALON_LAT + 0.00085;
      const userLon = SALON_LON;
      const distance = NumberUtils.calculateDistance(SALON_LAT, SALON_LON, userLat, userLon);
      expect(distance).toBeLessThanOrEqual(ALLOWED_RADIUS);

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          latitude: userLat,
          longitude: userLon,
        });

      expect(res.status).toBe(201);
      expect(res.body.attendance.distanceFromSalon).toBe(distance);
    });
  });

  describe('2. Negative Use Cases: Outside Radius & Exceeded Boundary Calculation', () => {
    it('rejects check-in when user is slightly outside the radius (e.g. ~115m for 100m radius)', async () => {
      // 0.00105 degrees lat is approximately ~116 meters
      const userLat = SALON_LAT + 0.00105;
      const userLon = SALON_LON;
      const distance = NumberUtils.calculateDistance(SALON_LAT, SALON_LON, userLat, userLon);
      expect(distance).toBeGreaterThan(ALLOWED_RADIUS);

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          latitude: userLat,
          longitude: userLon,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('OUT_OF_RANGE');
      expect(res.body.message).toContain('outside the permitted salon radius');
      expect(res.body.details).toBeDefined();
      expect(res.body.details.allowedRadius).toBe(ALLOWED_RADIUS);
      expect(res.body.details.distance).toBe(Math.round(distance * 100) / 100);
      expect(res.body.details.exceededBy).toBe(Math.round((distance - ALLOWED_RADIUS) * 100) / 100);

      // CRITICAL: Ensure NO attendance record was created in the database
      const count = await Attendance.countDocuments({ salonId: salon._id, userId: staffUser._id });
      expect(count).toBe(0);
    });

    it('rejects check-in when user is far away (e.g. 5 kilometers away)', async () => {
      // ~0.045 degrees lat is approximately 5 km
      const userLat = SALON_LAT + 0.045;
      const userLon = SALON_LON;
      const distance = NumberUtils.calculateDistance(SALON_LAT, SALON_LON, userLat, userLon);
      expect(distance).toBeGreaterThan(4000);

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          latitude: userLat,
          longitude: userLon,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('OUT_OF_RANGE');
      expect(res.body.details.distance).toBeGreaterThan(4000);
      expect(res.body.details.exceededBy).toBe(Math.round((res.body.details.distance - ALLOWED_RADIUS) * 100) / 100);

      // Verify no record saved
      const count = await Attendance.countDocuments();
      expect(count).toBe(0);
    });
  });

  describe('3. Validation & Edge Cases: Missing and Invalid Coordinates', () => {
    it('returns 400 when latitude is missing', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ longitude: SALON_LON });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      const count = await Attendance.countDocuments();
      expect(count).toBe(0);
    });

    it('returns 400 when longitude is null', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ latitude: SALON_LAT, longitude: null });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      const count = await Attendance.countDocuments();
      expect(count).toBe(0);
    });

    it('returns 400 when coordinates are non-numeric strings', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ latitude: 'not-a-number', longitude: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      const count = await Attendance.countDocuments();
      expect(count).toBe(0);
    });

    it('returns 400 when latitude is out of bounds (> 90 degrees)', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ latitude: 95.5, longitude: SALON_LON });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      const count = await Attendance.countDocuments();
      expect(count).toBe(0);
    });

    it('returns 400 when longitude is out of bounds (> 180 degrees)', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ latitude: SALON_LAT, longitude: 185.0 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      const count = await Attendance.countDocuments();
      expect(count).toBe(0);
    });
  });

  describe('4. Salon Configuration & Security Use Cases', () => {
    it('returns 400 SALON_LOCATION_NOT_CONFIGURED if salon coordinates are not configured in DB', async () => {
      // Create user for salonWithoutLocation
      const unconfiguredUser = await User.create({
        name: 'Staff Unconfigured',
        email: 'unconfigured_staff@salon.com',
        passwordHash: await hashPassword('Password@123'),
        roleId: role._id,
        salonId: salonWithoutLocation._id,
        isActive: true,
      });

      const unconfiguredToken = signToken({
        userId: unconfiguredUser._id.toString(),
        role: 'STAFF',
        roleId: role._id.toString(),
        salonId: salonWithoutLocation._id.toString(),
      });

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${unconfiguredToken}`)
        .send({
          latitude: SALON_LAT,
          longitude: SALON_LON,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('SALON_LOCATION_NOT_CONFIGURED');
      const count = await Attendance.countDocuments();
      expect(count).toBe(0);
    });

    it('prevents client from bypassing geofencing by sending fake extra parameters', async () => {
      // Client tries sending fake "distance" or "allowedRadius" or "forceCheckIn"
      const userLat = SALON_LAT + 0.05; // 5.5 km away
      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          latitude: userLat,
          longitude: SALON_LON,
          distance: 10,
          distanceFromSalon: 5,
          allowedRadius: 10000,
          bypass: true,
        });

      // Server must calculate distance itself and reject
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('OUT_OF_RANGE');
      expect(res.body.details.distance).toBeGreaterThan(5000);
      const count = await Attendance.countDocuments();
      expect(count).toBe(0);
    });

    it('rejects duplicate check-in on the same day with 400 DUPLICATE_CHECK_IN', async () => {
      // First check-in inside radius
      const firstRes = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          latitude: SALON_LAT,
          longitude: SALON_LON,
        });
      expect(firstRes.status).toBe(201);

      // Second check-in attempt on the same day
      const secondRes = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          latitude: SALON_LAT,
          longitude: SALON_LON,
        });

      expect(secondRes.status).toBe(400);
      expect(secondRes.body.error).toBe('DUPLICATE_CHECK_IN');
      expect(secondRes.body.message).toContain('already checked in for today');

      // Total count remains exactly 1
      const count = await Attendance.countDocuments({ salonId: salon._id, userId: staffUser._id });
      expect(count).toBe(1);
    });
  });

  describe('5. Today Attendance Status API', () => {
    it('returns hasCheckedIn: false and salonLocation before check-in', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/today')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.hasCheckedIn).toBe(false);
      expect(res.body.attendance).toBeNull();
      expect(res.body.salonLocation).toBeDefined();
      expect(res.body.salonLocation.latitude).toBe(SALON_LAT);
      expect(res.body.salonLocation.longitude).toBe(SALON_LON);
      expect(res.body.salonLocation.allowedRadius).toBe(ALLOWED_RADIUS);
    });

    it('returns hasCheckedIn: true with recorded attendance after check-in', async () => {
      await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ latitude: SALON_LAT, longitude: SALON_LON });

      const res = await request(app)
        .get('/api/v1/attendance/today')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.hasCheckedIn).toBe(true);
      expect(res.body.attendance).toBeDefined();
      expect(res.body.attendance.status).toBe('PRESENT');
      expect(res.body.attendance.distanceFromSalon).toBe(0);
    });
  });
});
