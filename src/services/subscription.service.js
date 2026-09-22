const Company = require('../models/company.model');
const Plan = require('../models/plan.model');
const SubscriptionHistory = require('../models/subscriptionHistory.model');
const Staff = require('../models/staff.model');
const Appointment = require('../models/appointment.model');

class SubscriptionService {
  /**
   * Retrieves active company subscription details, limits, and live quota usage.
   *
   * @param {string} companyId
   * @returns {Promise<Object>}
   */
  async getCurrentSubscription(companyId) {
    const company = await Company.findById(companyId).populate('currentPlanId');
    if (!company) {
      const err = new Error('Company not found.');
      err.status = 404;
      throw err;
    }

    const now = new Date();
    let isExpired = false;

    if (company.subscriptionEndDate && new Date(company.subscriptionEndDate) < now) {
      isExpired = true;
      if (company.subscriptionStatus === 'ACTIVE') {
        company.subscriptionStatus = 'EXPIRED';
        await company.save();
      }
    } else if (company.subscriptionStatus === 'EXPIRED' || !company.currentPlanId) {
      isExpired = true;
    }

    const plan = company.currentPlanId;
    const remainingDays =
      company.subscriptionEndDate && !isExpired
        ? Math.max(0, Math.ceil((new Date(company.subscriptionEndDate) - now) / (1000 * 60 * 60 * 24)))
        : 0;

    // Quota counts
    const staffCount = await Staff.countDocuments({ companyId, isActive: true });
    
    // Count active appointments within current subscription cycle
    const appointmentQuery = {
      companyId,
      status: { $ne: 'CANCELLED' },
    };
    if (company.subscriptionStartDate) {
      appointmentQuery.createdAt = { $gte: company.subscriptionStartDate };
    }
    const appointmentsCount = await Appointment.countDocuments(appointmentQuery);

    return {
      companyId: company._id.toString(),
      companyName: company.name,
      status: company.subscriptionStatus,
      isExpired,
      startDate: company.subscriptionStartDate,
      endDate: company.subscriptionEndDate,
      remainingDays,
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
   * Assigns a plan to the company.
   *
   * @param {string} companyId
   * @param {string} planId
   * @returns {Promise<Object>}
   */
  async assignPlan(companyId, planId) {
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      const err = new Error('Plan not found or is currently inactive.');
      err.status = 404;
      err.code = 'PLAN_NOT_FOUND';
      throw err;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      const err = new Error('Company not found.');
      err.status = 404;
      throw err;
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + plan.durationInDays * 24 * 60 * 60 * 1000);

    company.currentPlanId = plan._id;
    company.subscriptionStartDate = startDate;
    company.subscriptionEndDate = endDate;
    company.subscriptionStatus = 'ACTIVE';
    await company.save();

    await SubscriptionHistory.create({
      companyId,
      planId: plan._id,
      startDate,
      endDate,
      price: plan.price,
      action: 'ASSIGN',
    });

    return this.getCurrentSubscription(companyId);
  }

  /**
   * Renews the current company subscription.
   *
   * @param {string} companyId
   * @returns {Promise<Object>}
   */
  async renewSubscription(companyId) {
    const company = await Company.findById(companyId).populate('currentPlanId');
    if (!company) {
      const err = new Error('Company not found.');
      err.status = 404;
      throw err;
    }

    if (!company.currentPlanId) {
      const err = new Error('Company has no active or previous plan to renew. Please assign a plan first.');
      err.status = 400;
      err.code = 'NO_PLAN_TO_RENEW';
      throw err;
    }

    const plan = company.currentPlanId;
    const now = new Date();
    
    // If currently active and end date is in the future, extend from current end date
    const baseDate =
      company.subscriptionEndDate && new Date(company.subscriptionEndDate) > now
        ? new Date(company.subscriptionEndDate)
        : now;

    const startDate = company.subscriptionStartDate || now;
    const endDate = new Date(baseDate.getTime() + plan.durationInDays * 24 * 60 * 60 * 1000);

    company.subscriptionEndDate = endDate;
    company.subscriptionStatus = 'ACTIVE';
    await company.save();

    await SubscriptionHistory.create({
      companyId,
      planId: plan._id,
      startDate: now,
      endDate,
      price: plan.price,
      action: 'RENEW',
    });

    return this.getCurrentSubscription(companyId);
  }

  /**
   * Upgrades / changes company to a new plan tier.
   *
   * @param {string} companyId
   * @param {string} newPlanId
   * @returns {Promise<Object>}
   */
  async upgradePlan(companyId, newPlanId) {
    const newPlan = await Plan.findById(newPlanId);
    if (!newPlan || !newPlan.isActive) {
      const err = new Error('Selected plan not found or is currently inactive.');
      err.status = 404;
      err.code = 'PLAN_NOT_FOUND';
      throw err;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      const err = new Error('Company not found.');
      err.status = 404;
      throw err;
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + newPlan.durationInDays * 24 * 60 * 60 * 1000);

    company.currentPlanId = newPlan._id;
    company.subscriptionStartDate = startDate;
    company.subscriptionEndDate = endDate;
    company.subscriptionStatus = 'ACTIVE';
    await company.save();

    await SubscriptionHistory.create({
      companyId,
      planId: newPlan._id,
      startDate,
      endDate,
      price: newPlan.price,
      action: 'UPGRADE',
    });

    return this.getCurrentSubscription(companyId);
  }

  /**
   * Retrieves subscription history audit trail scoped strictly to company.
   *
   * @param {string} companyId
   * @returns {Promise<Array<Object>>}
   */
  async getSubscriptionHistory(companyId) {
    const history = await SubscriptionHistory.find({ companyId })
      .populate('planId', 'name price durationInDays maxStaff maxAppointments')
      .sort({ createdAt: -1 });

    return history.map((h) => ({
      id: h._id.toString(),
      _id: h._id.toString(),
      companyId: h.companyId,
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
   * @param {string} companyId
   */
  async validateStaffLimit(companyId) {
    const company = await Company.findById(companyId).populate('currentPlanId');
    if (!company) {
      const err = new Error('Company not found.');
      err.status = 404;
      throw err;
    }

    const now = new Date();
    if (
      company.subscriptionStatus !== 'ACTIVE' ||
      !company.subscriptionEndDate ||
      new Date(company.subscriptionEndDate) < now
    ) {
      const err = new Error('Your subscription has expired. Please contact the administrator to renew your plan.');
      err.status = 403;
      err.code = 'SUBSCRIPTION_EXPIRED';
      throw err;
    }

    const plan = company.currentPlanId;
    if (!plan) {
      const err = new Error('No active subscription plan assigned to your company.');
      err.status = 403;
      err.code = 'SUBSCRIPTION_EXPIRED';
      throw err;
    }

    const currentStaffCount = await Staff.countDocuments({ companyId, isActive: true });
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
   * @param {string} companyId
   */
  async validateAppointmentLimit(companyId) {
    const company = await Company.findById(companyId).populate('currentPlanId');
    if (!company) {
      const err = new Error('Company not found.');
      err.status = 404;
      throw err;
    }

    const now = new Date();
    if (
      company.subscriptionStatus !== 'ACTIVE' ||
      !company.subscriptionEndDate ||
      new Date(company.subscriptionEndDate) < now
    ) {
      const err = new Error('Your subscription has expired. Please contact the administrator to renew your plan.');
      err.status = 403;
      err.code = 'SUBSCRIPTION_EXPIRED';
      throw err;
    }

    const plan = company.currentPlanId;
    if (!plan) {
      const err = new Error('No active subscription plan assigned to your company.');
      err.status = 403;
      err.code = 'SUBSCRIPTION_EXPIRED';
      throw err;
    }

    const appointmentQuery = {
      companyId,
      status: { $ne: 'CANCELLED' },
    };
    if (company.subscriptionStartDate) {
      appointmentQuery.createdAt = { $gte: company.subscriptionStartDate };
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
