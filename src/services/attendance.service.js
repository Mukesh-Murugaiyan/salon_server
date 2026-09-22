const Attendance = require('../models/attendance.model');
const Salon = require('../models/salon.model');

/**
 * Calculates great-circle distance between two points on a sphere using the Haversine formula.
 * @param {number} lat1 - Latitude of point 1 (in decimal degrees)
 * @param {number} lon1 - Longitude of point 1 (in decimal degrees)
 * @param {number} lat2 - Latitude of point 2 (in decimal degrees)
 * @param {number} lon2 - Longitude of point 2 (in decimal degrees)
 * @returns {number} Distance in meters rounded to 2 decimal places
 */
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100;
};

class AttendanceService {
  /**
   * Processes an employee check-in with server-side geo-fencing calculation.
   *
   * @param {Object} params
   * @param {string} params.salonId - Authenticated salon ID
   * @param {string} params.userId - Authenticated user ID
   * @param {number} params.latitude - Check-in latitude
   * @param {number} params.longitude - Check-in longitude
   * @returns {Promise<Object>} Newly created attendance record
   */
  async checkIn({ salonId, userId, latitude, longitude }) {
    // 1. Validate latitude and longitude coordinates
    if (
      latitude === undefined ||
      latitude === null ||
      longitude === undefined ||
      longitude === null ||
      latitude === '' ||
      longitude === ''
    ) {
      const error = new Error('Coordinates are required.');
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    // 2. Retrieve salon location configuration
    const salon = await Salon.findById(salonId);
    if (!salon) {
      const error = new Error('Salon not found.');
      error.status = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    if (
      salon.latitude === null ||
      salon.latitude === undefined ||
      salon.longitude === null ||
      salon.longitude === undefined
    ) {
      const error = new Error('Salon location coordinates have not been configured. Please configure salon location in settings.');
      error.status = 400;
      error.code = 'SALON_LOCATION_NOT_CONFIGURED';
      throw error;
    }

    // 3. Check for existing check-in on the same date (YYYY-MM-DD)
    const todayDate = new Date().toISOString().slice(0, 10);
    const existingAttendance = await Attendance.findOne({
      salonId,
      userId,
      date: todayDate,
    });

    if (existingAttendance) {
      const error = new Error('You have already checked in for today.');
      error.status = 400;
      error.code = 'DUPLICATE_CHECK_IN';
      throw error;
    }

    // 4. Calculate distance using server-side Haversine formula
    const distance = calculateHaversineDistance(
      salon.latitude,
      salon.longitude,
      latitude,
      longitude
    );

    const allowedRadius = salon.allowedRadiusInMeters || 100;

    // 5. Enforce geo-fencing: reject if out of permitted radius
    if (distance > allowedRadius) {
      const error = new Error('You are outside the permitted salon radius for check-in.');
      error.status = 403;
      error.code = 'OUT_OF_RANGE';
      error.details = {
        distance: Math.round(distance),
        allowedRadius,
      };
      throw error;
    }

    // 6. Save attendance record
    const attendance = await Attendance.create({
      salonId,
      userId,
      date: todayDate,
      checkInTime: new Date(),
      latitude,
      longitude,
      distanceFromSalon: distance,
      status: 'PRESENT',
    });

    await attendance.populate('userId', 'name email');

    return attendance;
  }

  /**
   * Retrieves today's check-in status for the authenticated user.
   */
  async getTodayAttendance({ salonId, userId }) {
    const todayDate = new Date().toISOString().slice(0, 10);
    const attendance = await Attendance.findOne({
      salonId,
      userId,
      date: todayDate,
    }).populate('userId', 'name email');

    return attendance;
  }

  /**
   * Lists attendance records for the salon with filtering and pagination.
   */
  async listAttendance({ salonId, date, userId, status, page = 1, limit = 50 }) {
    const query = { salonId };

    if (date) {
      query.date = date;
    }
    if (userId) {
      query.userId = userId;
    }
    if (status) {
      query.status = status;
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, Math.max(1, parseInt(limit, 10)));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [attendance, total] = await Promise.all([
      Attendance.find(query)
        .sort({ checkInTime: -1 })
        .skip(skip)
        .limit(take)
        .populate('userId', 'name email'),
      Attendance.countDocuments(query),
    ]);

    return {
      attendance,
      total,
      page: parseInt(page, 10) || 1,
      totalPages: Math.ceil(total / take) || 1,
    };
  }

  /**
   * Retrieves a single attendance record by ID strictly scoped to the tenant.
   */
  async getAttendanceById({ salonId, id }) {
    const attendance = await Attendance.findOne({
      _id: id,
      salonId,
    }).populate('userId', 'name email');

    if (!attendance) {
      const error = new Error('Attendance record not found.');
      error.status = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    return attendance;
  }

  /**
   * Retrieves the salon's configured geo-fence location and allowed radius.
   */
  async getSalonLocation(salonId) {
    const salon = await Salon.findById(salonId);
    if (!salon) {
      const error = new Error('Salon not found.');
      error.status = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    return {
      latitude: salon.latitude,
      longitude: salon.longitude,
      allowedRadiusInMeters: salon.allowedRadiusInMeters || 100,
      isConfigured: salon.latitude !== null && salon.longitude !== null,
    };
  }

  /**
   * Updates salon geo-fence coordinates and allowed radius.
   */
  async updateSalonLocation(salonId, { latitude, longitude, allowedRadiusInMeters }) {
    if (
      latitude === undefined ||
      latitude === null ||
      longitude === undefined ||
      longitude === null ||
      latitude === '' ||
      longitude === ''
    ) {
      const error = new Error('Coordinates are required.');
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const radius = Number(allowedRadiusInMeters);
    if (Number.isNaN(radius) || radius < 1 || radius > 50000) {
      const error = new Error('Allowed radius must be between 1 and 50,000 meters.');
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const salon = await Salon.findById(salonId);
    if (!salon) {
      const error = new Error('Salon not found.');
      error.status = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    salon.latitude = latitude;
    salon.longitude = longitude;
    salon.allowedRadiusInMeters = radius;
    await salon.save();

    return {
      latitude: salon.latitude,
      longitude: salon.longitude,
      allowedRadiusInMeters: salon.allowedRadiusInMeters,
      isConfigured: true,
    };
  }
}

module.exports = new AttendanceService();
