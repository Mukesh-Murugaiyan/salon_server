const Appointment = require('../models/appointment.model');
const Client = require('../models/client.model');
const Staff = require('../models/staff.model');
const Salon = require('../models/salon.model');
const { User } = require('../models/user.model');
const DateTime = require('../utils/DateTime');
const AppConfig = require('../config/AppConfig');

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
    const todayUTC = DateTime.getTodayUtcDateString();
    const todayLocal = DateTime.getTodayLocalDateString();
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
      Salon.findById(tenantId).select('subscriptionStatus name code openingTime closingTime'),
    ]);

    const entityName = salon?.name || user?.salon?.name || 'My Salon';
    const subscriptionStatus = salon?.subscriptionStatus || 'ACTIVE';
    const openingTime = salon?.openingTime || user?.salon?.openingTime || '09:00';
    const closingTime = salon?.closingTime || user?.salon?.closingTime || '20:00';

    return {
      todayAppointments,
      confirmedAppointments,
      activeClients,
      staffCount: staffCount || userCount || 0,
      userCount,
      subscriptionStatus,
      salonName: entityName,
      openingTime,
      closingTime,
    };
  }
}

module.exports = new DashboardService();
