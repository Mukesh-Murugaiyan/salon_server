const Appointment = require('../models/appointment.model');
const Client = require('../models/client.model');
const Salon = require('../models/salon.model');
const { User } = require('../models/user.model');
const { getStartOfDay, getEndOfDay } = require('../utils/date.utils');

class DashboardService {
  /**
   * Calculates dashboard summary metrics strictly scoped to authenticated user's salon.
   *
   * @param {Object} user - Authenticated user context from req.user
   * @returns {Promise<Object>}
   */
  async getDashboardSummary(user) {
    const tenantId = user?.salonId;
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
      salon,
    ] = await Promise.all([
      // Count today's total appointments
      Appointment.countDocuments({
        salonId: tenantId,
        date: { $gte: startOfToday, $lte: endOfToday },
      }),
      // Count today's confirmed appointments
      Appointment.countDocuments({
        salonId: tenantId,
        date: { $gte: startOfToday, $lte: endOfToday },
        status: 'CONFIRMED',
      }),
      // Count active clients registered under this salon
      Client.countDocuments({
        salonId: tenantId,
        isActive: true,
      }),
      // Count active users in this salon
      User.countDocuments({
        salonId: tenantId,
        isActive: true,
      }),
      // Fetch salon details
      Salon.findById(tenantId).select('subscriptionStatus name code'),
    ]);

    const entityName = salon?.name || user?.salon?.name || 'My Salon';
    const subscriptionStatus = salon?.subscriptionStatus || 'ACTIVE';

    return {
      todayAppointments,
      confirmedAppointments,
      activeClients,
      staffCount,
      subscriptionStatus,
      salonName: entityName,
    };
  }
}

module.exports = new DashboardService();
