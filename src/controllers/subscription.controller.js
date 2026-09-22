const subscriptionService = require('../services/subscription.service');
const { getSalonIdFromUser } = require('../utils/tenant');

class SubscriptionController {
  resolveSalonId(req) {
    const userSalonId = getSalonIdFromUser(req);
    if (!userSalonId) {
      // Super Admin fallback: allow passing salonId
      return req.body.salonId || req.query.salonId || null;
    }
    return userSalonId;
  }

  /**
   * GET /api/v1/subscription
   */
  async getCurrentSubscription(req, res, next) {
    try {
      const salonId = this.resolveSalonId(req);
      if (!salonId) {
        return res.status(400).json({ success: false, message: 'Salon context is required.' });
      }

      const subscription = await subscriptionService.getCurrentSubscription(salonId);

      return res.status(200).json({
        success: true,
        subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/subscription/assign
   */
  async assignPlan(req, res, next) {
    try {
      const salonId = this.resolveSalonId(req);
      if (!salonId) {
        return res.status(400).json({ success: false, message: 'Salon context is required.' });
      }

      const { planId } = req.body;

      if (!planId) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Plan ID is required.',
        });
      }

      const subscription = await subscriptionService.assignPlan(salonId, planId);

      return res.status(200).json({
        success: true,
        subscription,
        message: 'Plan assigned successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/subscription/renew
   */
  async renewSubscription(req, res, next) {
    try {
      const salonId = this.resolveSalonId(req);
      if (!salonId) {
        return res.status(400).json({ success: false, message: 'Salon context is required.' });
      }

      const subscription = await subscriptionService.renewSubscription(salonId);

      return res.status(200).json({
        success: true,
        subscription,
        message: 'Subscription renewed successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/subscription/upgrade
   */
  async upgradePlan(req, res, next) {
    try {
      const salonId = this.resolveSalonId(req);
      if (!salonId) {
        return res.status(400).json({ success: false, message: 'Salon context is required.' });
      }

      const { planId } = req.body;

      if (!planId) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Target Plan ID is required.',
        });
      }

      const subscription = await subscriptionService.upgradePlan(salonId, planId);

      return res.status(200).json({
        success: true,
        subscription,
        message: 'Subscription upgraded successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/subscription/history
   */
  async getSubscriptionHistory(req, res, next) {
    try {
      const salonId = this.resolveSalonId(req);
      if (!salonId) {
        return res.status(400).json({ success: false, message: 'Salon context is required.' });
      }

      const history = await subscriptionService.getSubscriptionHistory(salonId);

      return res.status(200).json({
        success: true,
        history,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/subscription/remove
   */
  async removePlan(req, res, next) {
    try {
      const salonId = this.resolveSalonId(req);
      if (!salonId) {
        return res.status(400).json({ success: false, message: 'Salon context is required.' });
      }

      const subscription = await subscriptionService.removeSalonPlan(salonId);

      return res.status(200).json({
        success: true,
        subscription,
        message: 'Plan removed successfully.',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SubscriptionController();
