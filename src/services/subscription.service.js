const Salon = require('../models/salon.model');
const Plan = require('../models/plan.model');
const SubscriptionHistory = require('../models/subscriptionHistory.model');
const Staff = require('../models/staff.model');
const Appointment = require('../models/appointment.model');

class SubscriptionService {
  /**
   * Retrieves active salon subscription details, limits, and live quota usage.
   *
   * @param {string} salonId
   * @returns {Promise<Object>}
   */
  async getCurrentSubscription(salonId) {
    const salon = await Salon.findById(salonId).populate('currentPlanId');
    if (!salon) {
      const err = new Error('Salon not found.');
      err.status = 404;
      throw err;
    }

    const now = new Date();
    let isExpired = false;

    if (salon.subscriptionEndDate && new Date(salon.subscriptionEndDate) < now) {
      isExpired = true;
      if (salon.subscriptionStatus === 'ACTIVE') {
        salon.subscriptionStatus = 'EXPIRED';
        await salon.save();
      }
    } else if (salon.subscriptionStatus === 'EXPIRED' || !salon.currentPlanId) {
      isExpired = true;
    }

    const plan = salon.currentPlanId;
    const daysRemaining =
      salon.subscriptionEndDate && !isExpired
        ? Math.max(0, Math.ceil((new Date(salon.subscriptionEndDate) - now) / (1000 * 60 * 60 * 24)))
        : 0;

    // Quota counts
    const staffCount = await Staff.countDocuments({ salonId, isActive: true });

    // Count active appointments within current subscription cycle
    const appointmentQuery = {
      salonId,
      status: { $ne: 'CANCELLED' },
    };
    if (salon.subscriptionStartDate) {
      appointmentQuery.createdAt = { $gte: salon.subscriptionStartDate };
    }
    const appointmentsCount = await Appointment.countDocuments(appointmentQuery);

    return {
      salonId: salon._id.toString(),
      salonName: salon.name,
      status: salon.subscriptionStatus,
      isExpired,
      startDate: salon.subscriptionStartDate,
      endDate: salon.subscriptionEndDate,
      daysRemaining,
      plan: plan
        ? {
          id: plan._id.toString(),
          _id: plan._id.toString(),
          name: plan.name,
          description: plan.description,
          price: plan.price,
          durationInDays: plan.durationInDays,
          maxStaff: plan.maxStaff,
          maxAppointments: plan.maxAppointments,
        }
        : null,
      usage: {
        staffCount,
        maxStaff: plan ? plan.maxStaff : 0,
        appointmentsCount,
        maxAppointments: plan ? plan.maxAppointments : 0,
      },
    };
  }

  /**
   * Assigns a plan to the salon.
   *
   * @param {string} salonId
   * @param {string} planId
   * @returns {Promise<Object>}
   */
  async assignPlan(salonId, planId) {
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      const err = new Error('Plan not found or is currently inactive.');
      err.status = 404;
      err.code = 'PLAN_NOT_FOUND';
      throw err;
    }

    const salon = await Salon.findById(salonId);
    if (!salon) {
      const err = new Error('Salon not found.');
      err.status = 404;
      throw err;
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + plan.durationInDays * 24 * 60 * 60 * 1000);

    salon.currentPlanId = plan._id;
    salon.subscriptionStartDate = startDate;
    salon.subscriptionEndDate = endDate;
    salon.subscriptionStatus = 'ACTIVE';
    await salon.save();

    await SubscriptionHistory.create({
      salonId,
      planId: plan._id,
      startDate,
      endDate,
      price: plan.price,
      action: 'ASSIGN',
    });

    return this.getCurrentSubscription(salonId);
  }

  /**
   * Universal method for Super Admin to assign or change a plan,
   * determining the action (ASSIGN vs UPGRADE) dynamically.
   *
   * @param {string} salonId
   * @param {string} planId
   * @param {string} startDateString - Optional start date from frontend
   * @returns {Promise<Object>}
   */
  async manageSalonPlan(salonId, planId, startDateString) {
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      const err = new Error('Selected plan not found or is currently inactive.');
      err.status = 404;
      err.code = 'PLAN_NOT_FOUND';
      throw err;
    }

    const salon = await Salon.findById(salonId);
    if (!salon) {
      const err = new Error('Salon not found.');
      err.status = 404;
      throw err;
    }

    const action = salon.currentPlanId ? 'UPGRADE' : 'ASSIGN';
    const startDate = startDateString ? new Date(startDateString) : new Date();

    // Ensure valid date
    if (isNaN(startDate.getTime())) {
      const err = new Error('Please provide a valid subscription start date.');
      err.status = 400;
      err.code = 'INVALID_START_DATE';
      throw err;
    }

    const endDate = new Date(startDate.getTime() + plan.durationInDays * 24 * 60 * 60 * 1000);

    salon.currentPlanId = plan._id;
    salon.subscriptionStartDate = startDate;
    salon.subscriptionEndDate = endDate;
    salon.subscriptionStatus = 'ACTIVE';
    await salon.save();

    await SubscriptionHistory.create({
      salonId,
      planId: plan._id,
      startDate,
      endDate,
      price: plan.price,
      action,
    });

    return this.getCurrentSubscription(salonId);
  }

  /**
   * Completely removes the assigned plan from the salon.
   *
   * @param {string} salonId
   * @returns {Promise<Object>}
   */
  async removeSalonPlan(salonId) {
    const salon = await Salon.findById(salonId);
    if (!salon) {
      const err = new Error('Salon not found.');
      err.status = 404;
      throw err;
    }

    if (!salon.currentPlanId) {
      const err = new Error('Salon already has no plan assigned.');
      err.status = 400;
      throw err;
    }

    const previousPlanId = salon.currentPlanId;

    salon.currentPlanId = null;
    salon.subscriptionStartDate = null;
    salon.subscriptionEndDate = null;
    salon.subscriptionStatus = 'EXPIRED';
    await salon.save();

    await SubscriptionHistory.create({
      salonId,
      planId: previousPlanId,
      startDate: new Date(),
      endDate: new Date(),
      price: 0,
      action: 'REMOVE',
    });

    return this.getCurrentSubscription(salonId);
  }

  /**
   * Renews the current salon subscription.
   *
   * @param {string} salonId
   * @returns {Promise<Object>}
   */
  async renewSubscription(salonId) {
    const salon = await Salon.findById(salonId).populate('currentPlanId');
    if (!salon) {
      const err = new Error('Salon not found.');
      err.status = 404;
      throw err;
    }

    if (!salon.currentPlanId) {
      const err = new Error('Salon has no active or previous plan to renew. Please assign a plan first.');
      err.status = 400;
      err.code = 'NO_PLAN_TO_RENEW';
      throw err;
    }

    const plan = salon.currentPlanId;
    const now = new Date();

    // If currently active and end date is in the future, extend from current end date
    const baseDate =
      salon.subscriptionEndDate && new Date(salon.subscriptionEndDate) > now
        ? new Date(salon.subscriptionEndDate)
        : now;

    const startDate = salon.subscriptionStartDate || now;
    const endDate = new Date(baseDate.getTime() + plan.durationInDays * 24 * 60 * 60 * 1000);

    salon.subscriptionEndDate = endDate;
    salon.subscriptionStatus = 'ACTIVE';
    await salon.save();

    await SubscriptionHistory.create({
      salonId,
      planId: plan._id,
      startDate: now,
      endDate,
      price: plan.price,
      action: 'RENEW',
    });

    return this.getCurrentSubscription(salonId);
  }

  /**
   * Super Admin method to explicitly renew a salon plan.
   *
   * @param {string} salonId
   * @param {string} startDateString - Optional start date from frontend
   * @returns {Promise<Object>}
   */
  async renewSalonPlan(salonId, startDateString) {
    const salon = await Salon.findById(salonId).populate('currentPlanId');
    if (!salon) {
      const err = new Error('Salon not found.');
      err.status = 404;
      throw err;
    }

    if (!salon.currentPlanId) {
      const err = new Error('Salon has no active or previous plan to renew. Please assign a plan first.');
      err.status = 400;
      err.code = 'NO_PLAN_TO_RENEW';
      throw err;
    }

    const plan = salon.currentPlanId;
    const now = new Date();

    // If startDateString is provided, use it, else calculate baseDate
    let startDate;
    if (startDateString) {
      startDate = new Date(startDateString);
      if (isNaN(startDate.getTime())) {
        const err = new Error('Please provide a valid subscription start date.');
        err.status = 400;
        err.code = 'INVALID_START_DATE';
        throw err;
      }
    } else {
      const baseDate = salon.subscriptionEndDate && new Date(salon.subscriptionEndDate) > now
        ? new Date(salon.subscriptionEndDate)
        : now;
      startDate = baseDate;
    }

    const endDate = new Date(startDate.getTime() + plan.durationInDays * 24 * 60 * 60 * 1000);

    salon.subscriptionStartDate = startDate; // Depending on business rules, you may or may not update startDate. Usually renew extends from existing. We'll set it here based on payload.
    salon.subscriptionEndDate = endDate;
    salon.subscriptionStatus = 'ACTIVE';
    await salon.save();

    await SubscriptionHistory.create({
      salonId,
      planId: plan._id,
      startDate,
      endDate,
      price: plan.price,
      action: 'RENEW',
    });

    return this.getCurrentSubscription(salonId);
  }

  /**
   * Upgrades / changes salon to a new plan tier.
   *
   * @param {string} salonId
   * @param {string} newPlanId
   * @returns {Promise<Object>}
   */
  async upgradePlan(salonId, newPlanId) {
    const newPlan = await Plan.findById(newPlanId);
    if (!newPlan || !newPlan.isActive) {
      const err = new Error('Selected plan not found or is currently inactive.');
      err.status = 404;
      err.code = 'PLAN_NOT_FOUND';
      throw err;
    }

    const salon = await Salon.findById(salonId);
    if (!salon) {
      const err = new Error('Salon not found.');
      err.status = 404;
      throw err;
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + newPlan.durationInDays * 24 * 60 * 60 * 1000);

    salon.currentPlanId = newPlan._id;
    salon.subscriptionStartDate = startDate;
    salon.subscriptionEndDate = endDate;
    salon.subscriptionStatus = 'ACTIVE';
    await salon.save();

    await SubscriptionHistory.create({
      salonId,
      planId: newPlan._id,
      startDate,
      endDate,
      price: newPlan.price,
      action: 'UPGRADE',
    });

    return this.getCurrentSubscription(salonId);
  }

  /**
   * Retrieves subscription history audit trail scoped strictly to salon.
   *
   * @param {string} salonId
   * @returns {Promise<Array<Object>>}
   */
  async getSubscriptionHistory(salonId) {
    const history = await SubscriptionHistory.find({ salonId })
      .populate('planId', 'name price durationInDays maxStaff maxAppointments')
      .sort({ createdAt: -1 });

    return history.map((h) => ({
      id: h._id.toString(),
      _id: h._id.toString(),
      salonId: h.salonId,
      plan: h.planId
        ? {
          id: h.planId._id.toString(),
          _id: h.planId._id.toString(),
          name: h.planId.name,
          price: h.planId.price,
          durationInDays: h.planId.durationInDays,
          maxStaff: h.planId.maxStaff,
          maxAppointments: h.planId.maxAppointments,
        }
        : null,
      startDate: h.startDate,
      endDate: h.endDate,
      price: h.price,
      action: h.action,
      createdAt: h.createdAt,
    }));
  }

  /**
   * Enforces staff limit against current subscription plan.
   *
   * @param {string} salonId
   */
  async validateStaffLimit(salonId) {
    const salon = await Salon.findById(salonId).populate('currentPlanId');
    if (!salon) {
      const err = new Error('Salon not found.');
      err.status = 404;
      throw err;
    }

    const now = new Date();
    if (
      salon.subscriptionStatus !== 'ACTIVE' ||
      !salon.subscriptionEndDate ||
      new Date(salon.subscriptionEndDate) < now
    ) {
      const err = new Error('Your subscription has expired. Please contact the administrator to renew your plan.');
      err.status = 403;
      err.code = 'SUBSCRIPTION_EXPIRED';
      throw err;
    }

    const plan = salon.currentPlanId;
    if (!plan) {
      const err = new Error('No active subscription plan assigned to your salon.');
      err.status = 403;
      err.code = 'SUBSCRIPTION_EXPIRED';
      throw err;
    }

    const currentStaffCount = await Staff.countDocuments({ salonId, isActive: true });
    if (currentStaffCount >= plan.maxStaff) {
      const err = new Error(`Staff limit reached: Your current plan '${plan.name}' allows up to ${plan.maxStaff} active staff members. Please upgrade your subscription.`);
      err.status = 400;
      err.code = 'PLAN_LIMIT_EXCEEDED';
      throw err;
    }
  }

  /**
   * Enforces appointment limit against current subscription plan.
   *
   * @param {string} salonId
   */
  async validateAppointmentLimit(salonId) {
    const salon = await Salon.findById(salonId).populate('currentPlanId');
    if (!salon) {
      const err = new Error('Salon not found.');
      err.status = 404;
      throw err;
    }

    const now = new Date();
    if (
      salon.subscriptionStatus !== 'ACTIVE' ||
      !salon.subscriptionEndDate ||
      new Date(salon.subscriptionEndDate) < now
    ) {
      const err = new Error('Your subscription has expired. Please contact the administrator to renew your plan.');
      err.status = 403;
      err.code = 'SUBSCRIPTION_EXPIRED';
      throw err;
    }

    const plan = salon.currentPlanId;
    if (!plan) {
      const err = new Error('No active subscription plan assigned to your salon.');
      err.status = 403;
      err.code = 'SUBSCRIPTION_EXPIRED';
      throw err;
    }

    const appointmentQuery = {
      salonId,
      status: { $ne: 'CANCELLED' },
    };
    if (salon.subscriptionStartDate) {
      appointmentQuery.createdAt = { $gte: salon.subscriptionStartDate };
    }
    const currentAppointmentCount = await Appointment.countDocuments(appointmentQuery);

    if (currentAppointmentCount >= plan.maxAppointments) {
      const err = new Error(`Appointment limit reached: Your current plan '${plan.name}' allows up to ${plan.maxAppointments} appointments per cycle. Please upgrade your subscription.`);
      err.status = 400;
      err.code = 'PLAN_LIMIT_EXCEEDED';
      throw err;
    }
  }
}

module.exports = new SubscriptionService();
