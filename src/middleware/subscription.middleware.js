const Salon = require('../models/salon.model');
const { getSalonIdFromUser } = require('../utils/tenant');

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
    const salonId = getSalonIdFromUser(req);
    const salon = await Salon.findById(salonId);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found.',
      });
    }

    const now = new Date();
    const isExpired =
      salon.subscriptionStatus !== 'ACTIVE' ||
      !salon.subscriptionEndDate ||
      new Date(salon.subscriptionEndDate) < now;

    if (isExpired) {
      if (salon.subscriptionStatus === 'ACTIVE') {
        salon.subscriptionStatus = 'EXPIRED';
        await salon.save();
      }

      return res.status(403).json({
        error: 'SUBSCRIPTION_EXPIRED',
        message: 'Your subscription has expired. Please contact the administrator to renew your plan.',
      });
    }

    req.salon = salon;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requireActiveSubscription,
};
