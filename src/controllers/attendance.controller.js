const attendanceService = require('../services/attendance.service');

class AttendanceController {
  /**
   * Processes employee check-in with GPS geo-fencing.
   * POST /api/attendance/check-in
   */
  async checkIn(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const userId = req.user.id || req.user._id;
      const { latitude, longitude } = req.body;

      const attendance = await attendanceService.checkIn({
        companyId,
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
      const companyId = req.user.companyId;
      const userId = req.user.id || req.user._id;

      const attendance = await attendanceService.getTodayAttendance({
        companyId,
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
   * Lists company attendance logs with filtering.
   * GET /api/attendance
   */
  async listAttendance(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const { date, userId, status, page, limit } = req.query;

      const result = await attendanceService.listAttendance({
        companyId,
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
      const companyId = req.user.companyId;
      const { id } = req.params;

      const attendance = await attendanceService.getAttendanceById({
        companyId,
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
      const companyId = req.user.companyId;
      const location = await attendanceService.getSalonLocation(companyId);

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
      const companyId = req.user.companyId;
      const { latitude, longitude, allowedRadiusInMeters } = req.body;

      const location = await attendanceService.updateSalonLocation(companyId, {
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
