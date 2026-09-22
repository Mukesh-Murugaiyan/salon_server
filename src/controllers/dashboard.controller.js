const dashboardService = require('../services/dashboard.service');

class DashboardController {
  /**
   * GET /api/v1/dashboard/summary
   */
  async getSummary(req, res, next) {
    try {
      const summary = await dashboardService.getDashboardSummary(req.user);
      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
