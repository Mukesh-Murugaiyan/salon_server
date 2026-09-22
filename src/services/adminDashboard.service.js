const Salon = require('../models/salon.model');
const Plan = require('../models/plan.model');
const { User } = require('../models/user.model');

class AdminDashboardService {
  /**
   * Aggregates platform-wide SaaS metrics across all salons/tenants.
   *
   * @returns {Promise<Object>}
   */
  async getAdminDashboardSummary() {
    const [
      totalSalons,
      activeSubscriptions,
      expiredSubscriptions,
      totalPlans,
      totalUsers,
    ] = await Promise.all([
      Salon.countDocuments({ isActive: true }),
      Salon.countDocuments({ subscriptionStatus: 'ACTIVE' }),
      Salon.countDocuments({ subscriptionStatus: 'EXPIRED' }),
      Plan.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),
    ]);

    return {
      totalSalons,
      activeSubscriptions,
      expiredSubscriptions,
      totalPlans,
      totalUsers,
    };
  }
}

module.exports = new AdminDashboardService();
