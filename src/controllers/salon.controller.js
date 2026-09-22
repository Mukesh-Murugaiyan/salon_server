const salonService = require('../services/salon.service');
const subscriptionService = require('../services/subscription.service');

class SalonController {
  /**
   * Retrieves a paginated list of salons.
   */
  async listSalons(req, res, next) {
    try {
      const result = await salonService.listSalons(req.query);
      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves details for a single salon by ID.
   */
  async getSalon(req, res, next) {
    try {
      const salon = await salonService.getSalonById(req.params.id);
      res.json({
        success: true,
        salon,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Provisions a new salon tenant.
   */
  async createSalon(req, res, next) {
    try {
      const salon = await salonService.createSalon(req.body);
      res.status(201).json({
        success: true,
        message: 'Salon tenant successfully created.',
        salon,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates an existing salon.
   */
  async updateSalon(req, res, next) {
    try {
      const salon = await salonService.updateSalon(req.params.id, req.body);
      res.json({
        success: true,
        message: 'Salon successfully updated.',
        salon,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggles the active/inactive status of a salon.
   */
  async toggleStatus(req, res, next) {
    try {
      const { isActive } = req.body;
      if (isActive === undefined) {
        return res.status(400).json({
          success: false,
          message: 'isActive status flag is required.',
        });
      }

      const salon = await salonService.toggleStatus(req.params.id, isActive);
      res.json({
        success: true,
        message: `Salon has been ${salon.isActive ? 'activated' : 'deactivated'}.`,
        salon,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Universal method for Super Admin to assign or upgrade a plan for a salon
   */
  async manageSubscription(req, res, next) {
    try {
      const { planId, startDate } = req.body;

      if (!planId) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Plan ID is required.',
        });
      }

      const subscription = await subscriptionService.manageSalonPlan(req.params.id, planId, startDate);

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
   * Super Admin method to explicitly renew a salon plan
   */
  async renewSubscription(req, res, next) {
    try {
      const { startDate } = req.body;
      const subscription = await subscriptionService.renewSalonPlan(req.params.id, startDate);

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
   * Super Admin method to explicitly remove a salon plan
   */
  async removeSubscription(req, res, next) {
    try {
      const subscription = await subscriptionService.removeSalonPlan(req.params.id);

      return res.status(200).json({
        success: true,
        subscription,
        message: 'Subscription removed successfully.',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SalonController();
