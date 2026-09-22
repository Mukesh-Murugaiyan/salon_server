const Appointment = require('../models/appointment.model');
const Client = require('../models/client.model');
const Staff = require('../models/staff.model');
const Salon = require('../models/salon.model');
const { User } = require('../models/user.model');

class DashboardService {
  /**
   * Calculates dashboard summary metrics scoped to authenticated user's salon,
   * or platform-wide aggregated metrics if user is Super Admin / has no salonId.
   *
   * @param {Object} user - Authenticated user context from req.user
   * @returns {Promise<Object>}
   */
  async getDashboardSummary(user) {
    const tenantId = user?.salonId;

    // Build today's date strings in both UTC and local time to match string-formatted dates
    const todayUTC = new Date().toISOString().split('T')[0];
    const now = new Date();
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayDates = Array.from(new Set([todayUTC, todayLocal]));

    if (!tenantId) {
      // Super admin or platform user without specific salon: return platform overview
      const [
        todayAppointments,
        confirmedAppointments,
        activeClients,
        staffCount,
        userCount,
      ] = await Promise.all([
        Appointment.countDocuments({
          date: { $in: todayDates },
        }),
        Appointment.countDocuments({
          date: { $in: todayDates },
          status: 'CONFIRMED',
        }),
        Client.countDocuments({
          isActive: true,
        }),
        Staff.countDocuments({
          isActive: true,
        }),
        User.countDocuments({
          isActive: true,
        }),
      ]);

      return {
        todayAppointments,
        confirmedAppointments,
        activeClients,
        staffCount: staffCount || userCount || 0,
        userCount,
        subscriptionStatus: 'ACTIVE',
        salonName: 'Platform Overview',
      };
    }

    // Query live metrics from database collections for specific tenant
    const [
      todayAppointments,
      confirmedAppointments,
      activeClients,
      staffCount,
      userCount,
      salon,
    ] = await Promise.all([
      // Count today's total appointments
      Appointment.countDocuments({
        salonId: tenantId,
        date: { $in: todayDates },
      }),
      // Count today's confirmed appointments
      Appointment.countDocuments({
        salonId: tenantId,
        date: { $in: todayDates },
        status: 'CONFIRMED',
      }),
      // Count active clients registered under this salon
      Client.countDocuments({
        salonId: tenantId,
        isActive: true,
      }),
      // Count active staff members in this salon
      Staff.countDocuments({
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
      staffCount: staffCount || userCount || 0,
      userCount,
      subscriptionStatus,
      salonName: entityName,
    };
  }
}

module.exports = new DashboardService();
