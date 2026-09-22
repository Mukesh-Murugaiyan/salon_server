const Salon = require('../models/salon.model');
const Company = require('../models/company.model');
const Plan = require('../models/plan.model');
const { User } = require('../models/user.model');

class AdminDashboardService {
  /**
   * Aggregates platform-wide SaaS metrics across all companies/tenants.
   *
   * @returns {Promise<Object>}
   */
  async getAdminDashboardSummary() {
    const [
      totalCompanies,
      totalSalons,
      activeSubscriptions,
      expiredSubscriptions,
      totalPlans,
      totalUsers,
    ] = await Promise.all([
      Company.countDocuments({ isActive: true }),
      Salon.countDocuments({ isActive: true }),
      Salon.countDocuments({ subscriptionStatus: 'ACTIVE' }),
      Salon.countDocuments({ subscriptionStatus: 'EXPIRED' }),
      Plan.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),
    ]);

    return {
      totalSalons: totalCompanies || totalSalons,
      totalCompanies,
      activeSubscriptions,
      expiredSubscriptions,
      totalPlans,
      totalUsers,
    };
  }
}

module.exports = new AdminDashboardService();
