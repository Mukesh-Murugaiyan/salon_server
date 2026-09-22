const planService = require('../services/plan.service');

class PlanController {
  /**
   * GET /api/v1/plans
   */
  async listPlans(req, res, next) {
    try {
      const plans = await planService.listPlans(req.query);
      return res.status(200).json({
        success: true,
        plans,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/plans/:id
   */
  async getPlan(req, res, next) {
    try {
      const plan = await planService.getPlanById(req.params.id);
      return res.status(200).json({
        success: true,
        plan,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/plans
   */
  async createPlan(req, res, next) {
    try {
      const plan = await planService.createPlan(req.body);
      return res.status(201).json({
        success: true,
        plan,
        message: 'Plan created successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/plans/:id
   */
  async updatePlan(req, res, next) {
    try {
      const plan = await planService.updatePlan(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        plan,
        message: 'Plan updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/plans/:id
   */
  async deletePlan(req, res, next) {
    try {
      const result = await planService.deletePlan(req.params.id);
      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PlanController();
