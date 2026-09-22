const adminDashboardService = require('../services/adminDashboard.service');

class AdminDashboardController {
  /**
   * GET /api/v1/admin/dashboard/summary
   */
  async getSummary(req, res, next) {
    try {
      const summary = await adminDashboardService.getAdminDashboardSummary();
      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminDashboardController();
