const subscriptionService = require('../services/subscription.service');
const { getCompanyIdFromUser } = require('../utils/tenant');

class SubscriptionController {
  /**
   * GET /api/v1/subscription
   */
  async getCurrentSubscription(req, res, next) {
    try {
      const companyId = getCompanyIdFromUser(req);
      const subscription = await subscriptionService.getCurrentSubscription(companyId);

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
      const companyId = getCompanyIdFromUser(req);
      const { planId } = req.body;

      if (!planId) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Plan ID is required.',
        });
      }

      const subscription = await subscriptionService.assignPlan(companyId, planId);

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
      const companyId = getCompanyIdFromUser(req);
      const subscription = await subscriptionService.renewSubscription(companyId);

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
      const companyId = getCompanyIdFromUser(req);
      const { planId } = req.body;

      if (!planId) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Target Plan ID is required.',
        });
      }

      const subscription = await subscriptionService.upgradePlan(companyId, planId);

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
      const companyId = getCompanyIdFromUser(req);
      const history = await subscriptionService.getSubscriptionHistory(companyId);

      return res.status(200).json({
        success: true,
        history,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SubscriptionController();
