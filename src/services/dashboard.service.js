const Appointment = require('../models/appointment.model');
const Client = require('../models/client.model');
const Salon = require('../models/salon.model');
const Company = require('../models/company.model');
const { User } = require('../models/user.model');
const { getStartOfDay, getEndOfDay } = require('../utils/date.utils');

class DashboardService {
  /**
   * Calculates dashboard summary metrics strictly scoped to authenticated user's company/salon.
   *
   * @param {Object} user - Authenticated user context from req.user
   * @returns {Promise<Object>}
   */
  async getDashboardSummary(user) {
    const tenantId = user?.companyId || user?.salonId;
    if (!tenantId) {
      const err = new Error('Tenant context is required to access salon dashboard.');
      err.status = 400;
      err.code = 'TENANT_CONTEXT_MISSING';
      throw err;
    }

    const startOfToday = getStartOfDay();
    const endOfToday = getEndOfDay();

    // Query live metrics from database collections in parallel
    const [
      todayAppointments,
      confirmedAppointments,
      activeClients,
      staffCount,
      company,
      salon,
    ] = await Promise.all([
      // Count today's total appointments
      Appointment.countDocuments({
        $or: [{ salonId: tenantId }, { companyId: tenantId }],
        date: { $gte: startOfToday, $lte: endOfToday },
      }),
      // Count today's confirmed appointments
      Appointment.countDocuments({
        $or: [{ salonId: tenantId }, { companyId: tenantId }],
        date: { $gte: startOfToday, $lte: endOfToday },
        status: 'CONFIRMED',
      }),
      // Count active clients registered under this company
      Client.countDocuments({
        $or: [{ salonId: tenantId }, { companyId: tenantId }],
        isActive: true,
      }),
      // Count active users in this company
      User.countDocuments({
        $or: [{ companyId: tenantId }, { salonId: tenantId }],
        isActive: true,
      }),
      // Fetch company name
      Company.findById(tenantId).select('name code'),
      // Fetch legacy salon if present
      Salon.findById(tenantId).select('subscriptionStatus name'),
    ]);

    const entityName = company?.name || salon?.name || user?.company?.name || 'My Salon';
    const subscriptionStatus = salon?.subscriptionStatus || 'ACTIVE';

    return {
      todayAppointments,
      confirmedAppointments,
      activeClients,
      staffCount,
      subscriptionStatus,
      salonName: entityName,
      companyName: entityName,
    };
  }
}

module.exports = new DashboardService();
