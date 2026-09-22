const attendanceService = require('../services/attendance.service');

class AttendanceController {
  /**
   * Processes employee check-in with GPS geo-fencing.
   * POST /api/attendance/check-in
   */
  async checkIn(req, res, next) {
    try {
      const salonId = req.user.salonId;
      const userId = req.user.id || req.user._id;
      const { latitude, longitude } = req.body;

      const attendance = await attendanceService.checkIn({
        salonId,
        userId,
        latitude,
        longitude,
      });

      return res.status(201).json({
        success: true,
        message: 'Check-in successful.',
        attendance,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves today's attendance status for authenticated user.
   * GET /api/attendance/today
   */
  async getTodayStatus(req, res, next) {
    try {
      const salonId = req.user.salonId;
      const userId = req.user.id || req.user._id;

      const attendance = await attendanceService.getTodayAttendance({
        salonId,
        userId,
      });

      return res.status(200).json({
        success: true,
        attendance,
        hasCheckedIn: !!attendance,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lists salon attendance logs with filtering.
   * GET /api/attendance
   */
  async listAttendance(req, res, next) {
    try {
      const salonId = req.user.salonId;
      const { date, userId, status, page, limit } = req.query;

      const result = await attendanceService.listAttendance({
        salonId,
        date,
        userId,
        status,
        page,
        limit,
      });

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves single attendance record by ID.
   * GET /api/attendance/:id
   */
  async getAttendance(req, res, next) {
    try {
      const salonId = req.user.salonId;
      const { id } = req.params;

      const attendance = await attendanceService.getAttendanceById({
        salonId,
        id,
      });

      return res.status(200).json({
        success: true,
        attendance,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves salon configured geo-fence location and allowed radius.
   * GET /api/attendance/location
   */
  async getLocation(req, res, next) {
    try {
      const salonId = req.user.salonId;
      const location = await attendanceService.getSalonLocation(salonId);

      return res.status(200).json({
        success: true,
        location,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates salon geo-fence coordinates and radius.
   * PUT /api/attendance/location
   */
  async updateLocation(req, res, next) {
    try {
      const salonId = req.user.salonId;
      const { latitude, longitude, allowedRadiusInMeters } = req.body;

      const location = await attendanceService.updateSalonLocation(salonId, {
        latitude,
        longitude,
        allowedRadiusInMeters,
      });

      return res.status(200).json({
        success: true,
        message: 'Salon location settings updated successfully.',
        location,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AttendanceController();
