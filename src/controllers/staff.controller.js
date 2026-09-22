const staffService = require('../services/staff.service');
const { getSalonIdFromUser } = require('../utils/tenant');

class StaffController {
  /**
   * GET /api/v1/staff
   */
  async listStaff(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const staff = await staffService.listStaff(salonId, req.query);

      return res.status(200).json({
        success: true,
        staff,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/staff/:id
   */
  async getStaff(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const staffMember = await staffService.getStaffById(req.params.id, salonId);

      return res.status(200).json({
        success: true,
        staff: staffMember,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/staff
   */
  async createStaff(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const staffMember = await staffService.createStaff(salonId, req.body);

      return res.status(201).json({
        success: true,
        staff: staffMember,
        message: 'Staff member created successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/staff/:id or PATCH /api/v1/staff/:id
   */
  async updateStaff(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const staffMember = await staffService.updateStaff(req.params.id, salonId, req.body);

      return res.status(200).json({
        success: true,
        staff: staffMember,
        message: 'Staff details updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/staff/:id
   */
  async deleteStaff(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const result = await staffService.deleteStaff(req.params.id, salonId);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/staff/:id/status
   */
  async toggleStatus(req, res, next) {
    try {
      const { isActive } = req.body;
      if (isActive === undefined) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'isActive boolean flag is required.',
        });
      }

      const salonId = getSalonIdFromUser(req);
      const staffMember = await staffService.toggleStatus(req.params.id, salonId, isActive);

      return res.status(200).json({
        success: true,
        staff: staffMember,
        message: `Staff member status changed to ${isActive ? 'active' : 'inactive'}.`,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StaffController();
