const Company = require('../models/company.model');
const { getCompanyIdFromUser } = require('../utils/tenant');

/**
 * Middleware to enforce active subscription.
 * When subscription is expired or unassigned, returns the exact required payload:
 * {
 *   "error": "SUBSCRIPTION_EXPIRED",
 *   "message": "Your subscription has expired. Please contact the administrator to renew your plan."
 * }
 */
const requireActiveSubscription = async (req, res, next) => {
  try {
    const companyId = getCompanyIdFromUser(req);
    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found.',
      });
    }

    const now = new Date();
    const isExpired =
      company.subscriptionStatus !== 'ACTIVE' ||
      !company.subscriptionEndDate ||
      new Date(company.subscriptionEndDate) < now;

    if (isExpired) {
      if (company.subscriptionStatus === 'ACTIVE') {
        company.subscriptionStatus = 'EXPIRED';
        await company.save();
      }

      return res.status(403).json({
        error: 'SUBSCRIPTION_EXPIRED',
        message: 'Your subscription has expired. Please contact the administrator to renew your plan.',
      });
    }

    req.company = company;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requireActiveSubscription,
};
