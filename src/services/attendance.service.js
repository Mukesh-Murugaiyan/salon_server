const Attendance = require('../models/attendance.model');
const Company = require('../models/company.model');

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
   * @param {string} params.companyId - Authenticated company ID
   * @param {string} params.userId - Authenticated user ID
   * @param {number} params.latitude - Check-in latitude
   * @param {number} params.longitude - Check-in longitude
   * @returns {Promise<Object>} Newly created attendance record
   */
  async checkIn({ companyId, userId, latitude, longitude }) {
    // 1. Validate latitude and longitude coordinates
    if (
      latitude === undefined ||
      latitude === null ||
      longitude === undefined ||
      longitude === null ||
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      const error = new Error('Valid GPS coordinates (latitude between -90 and 90, longitude between -180 and 180) are required.');
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    // 2. Retrieve company location configuration
    const company = await Company.findById(companyId);
    if (!company) {
      const error = new Error('Company not found.');
      error.status = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    if (
      company.latitude === null ||
      company.latitude === undefined ||
      company.longitude === null ||
      company.longitude === undefined
    ) {
      const error = new Error('Salon location coordinates have not been configured. Please configure salon location in settings.');
      error.status = 400;
      error.code = 'SALON_LOCATION_NOT_CONFIGURED';
      throw error;
    }

    // 3. Check for existing check-in on the same date (YYYY-MM-DD)
    const todayDate = new Date().toISOString().slice(0, 10);
    const existingAttendance = await Attendance.findOne({
      companyId,
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
      company.latitude,
      company.longitude,
      latitude,
      longitude
    );

    const allowedRadius = company.allowedRadiusInMeters || 100;

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
      companyId,
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
  async getTodayAttendance({ companyId, userId }) {
    const todayDate = new Date().toISOString().slice(0, 10);
    const attendance = await Attendance.findOne({
      companyId,
      userId,
      date: todayDate,
    }).populate('userId', 'name email');

    return attendance;
  }

  /**
   * Lists attendance records for the company with filtering and pagination.
   */
  async listAttendance({ companyId, date, userId, status, page = 1, limit = 50 }) {
    const query = { companyId };

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
  async getAttendanceById({ companyId, id }) {
    const attendance = await Attendance.findOne({
      _id: id,
      companyId,
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
  async getSalonLocation(companyId) {
    const company = await Company.findById(companyId);
    if (!company) {
      const error = new Error('Company not found.');
      error.status = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    return {
      latitude: company.latitude,
      longitude: company.longitude,
      allowedRadiusInMeters: company.allowedRadiusInMeters || 100,
      isConfigured: company.latitude !== null && company.longitude !== null,
    };
  }

  /**
   * Updates salon geo-fence coordinates and allowed radius.
   */
  async updateSalonLocation(companyId, { latitude, longitude, allowedRadiusInMeters }) {
    if (
      latitude === undefined ||
      latitude === null ||
      longitude === undefined ||
      longitude === null ||
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      const error = new Error('Valid GPS coordinates (latitude between -90 and 90, longitude between -180 and 180) are required.');
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

    const company = await Company.findById(companyId);
    if (!company) {
      const error = new Error('Company not found.');
      error.status = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    company.latitude = latitude;
    company.longitude = longitude;
    company.allowedRadiusInMeters = radius;
    await company.save();

    return {
      latitude: company.latitude,
      longitude: company.longitude,
      allowedRadiusInMeters: company.allowedRadiusInMeters,
      isConfigured: true,
    };
  }
}

module.exports = new AttendanceService();
