const Attendance = require('../models/attendance.model');
const Salon = require('../models/salon.model');
const { User } = require('../models/user.model');
const NumberUtils = require('../utils/NumberUtils');
const Validation = require('../utils/Validation');
const DateTime = require('../utils/DateTime');
const AppConfig = require('../config/AppConfig');

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
    if (!Validation.isValidCoordinates(latitude, longitude)) {
      const error = new Error('Coordinates are required and must be valid numeric coordinates.');
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
    const todayDate = DateTime.getTodayUtcDateString();
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
    const distance = NumberUtils.calculateDistance(
      salon.latitude,
      salon.longitude,
      latitude,
      longitude
    );

    const allowedRadius = salon.allowedRadiusInMeters || AppConfig.GEOFENCING.DEFAULT_ALLOWED_RADIUS_METERS;

    // 5. Enforce geo-fencing: reject if out of permitted radius
    if (distance > allowedRadius) {
      const exceededBy = Math.round((distance - allowedRadius) * 100) / 100;
      const error = new Error('You are outside the permitted salon radius for check-in.');
      error.status = 403;
      error.code = 'OUT_OF_RANGE';
      error.details = {
        distance: Math.round(distance * 100) / 100,
        allowedRadius,
        exceededBy,
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
   * Processes employee check-out for today's attendance.
   *
   * @param {Object} params
   * @param {string} params.salonId - Authenticated salon ID
   * @param {string} params.userId - Authenticated user ID
   * @returns {Promise<Object>} Updated attendance record with checkOutTime
   */
  async checkOut({ salonId, userId }) {
    if (!salonId) {
      const error = new Error('Salon ID is required for check-out.');
      error.status = 400;
      error.code = 'SALON_REQUIRED';
      throw error;
    }

    const todayDate = DateTime.getTodayUtcDateString();
    const attendance = await Attendance.findOne({
      salonId,
      userId,
      date: todayDate,
    });

    if (!attendance) {
      const error = new Error('You must check in first before checking out.');
      error.status = 400;
      error.code = 'NOT_CHECKED_IN';
      throw error;
    }

    if (attendance.checkOutTime) {
      const error = new Error('You have already checked out for today.');
      error.status = 400;
      error.code = 'ALREADY_CHECKED_OUT';
      throw error;
    }

    attendance.checkOutTime = new Date();
    await attendance.save();
    await attendance.populate('userId', 'name email');

    return attendance;
  }

  /**
   * Retrieves today's check-in status and salon location configuration for the authenticated user.
   */
  async getTodayAttendance({ salonId, userId }) {
    const todayDate = DateTime.getTodayUtcDateString();
    const [attendance, salon] = await Promise.all([
      Attendance.findOne({
        salonId,
        userId,
        date: todayDate,
      }).populate('userId', 'name email'),
      Salon.findById(salonId).select('latitude longitude allowedRadiusInMeters name'),
    ]);

    return {
      attendance,
      hasCheckedIn: !!attendance,
      hasCheckedOut: !!(attendance && attendance.checkOutTime),
      salonLocation: salon
        ? {
            latitude: salon.latitude !== null && salon.latitude !== undefined ? Number(salon.latitude) : null,
            longitude: salon.longitude !== null && salon.longitude !== undefined ? Number(salon.longitude) : null,
            allowedRadius: salon.allowedRadiusInMeters || AppConfig.GEOFENCING.DEFAULT_ALLOWED_RADIUS_METERS,
            salonName: salon.name,
          }
        : null,
    };
  }

  /**
   * Lists attendance records for the salon with filtering, search and pagination.
   * Strictly tenant-isolated to salonId.
   */
  async listAttendance({ salonId, date, userId, status, search, page = 1, limit = 50 }) {
    const query = salonId ? { salonId } : {};

    if (date) {
      query.date = date;
    }
    if (userId) {
      query.userId = userId;
    }
    if (status) {
      query.status = status;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      const userFilter = salonId ? { salonId, $or: [{ name: searchRegex }, { email: searchRegex }] } : { $or: [{ name: searchRegex }, { email: searchRegex }] };
      const matchedUsers = await User.find(userFilter).select('_id');
      const userIds = matchedUsers.map((u) => u._id);
      query.userId = { $in: userIds };
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, Math.max(1, parseInt(limit, 10)));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [attendance, total] = await Promise.all([
      Attendance.find(query)
        .sort({ checkInTime: -1, createdAt: -1 })
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
    const query = { _id: id };
    if (salonId) {
      query.salonId = salonId;
    }
    const attendance = await Attendance.findOne(query).populate('userId', 'name email');

    if (!attendance) {
      const error = new Error('Attendance record not found.');
      error.status = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    return attendance;
  }

  /**
   * Deletes an attendance record strictly scoped to the tenant.
   * Deleting resets the user's attendance status and allows checking in again.
   *
   * @param {Object} params
   * @param {string} params.salonId - Authenticated salon ID
   * @param {string} params.id - Attendance record ID
   * @returns {Promise<Object>} The deleted attendance record
   */
  async deleteAttendance({ salonId, id }) {
    const query = { _id: id };
    if (salonId) {
      query.salonId = salonId;
    }

    const attendance = await Attendance.findOneAndDelete(query);

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
