const express = require('express');
const planController = require('../controllers/plan.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { MODULES, ACTIONS } = require('../constants/permissions');

const router = express.Router();

router.use(authenticate);

// List plans
router.get(
  '/',
  requirePermission(MODULES.PLANS, ACTIONS.VIEW),
  (req, res, next) => planController.listPlans(req, res, next)
);

// Get single plan
router.get(
  '/:id',
  requirePermission(MODULES.PLANS, ACTIONS.VIEW),
  (req, res, next) => planController.getPlan(req, res, next)
);

// Create new plan
router.post(
  '/',
  requirePermission(MODULES.PLANS, ACTIONS.CREATE),
  (req, res, next) => planController.createPlan(req, res, next)
);

// Update plan
router.put(
  '/:id',
  requirePermission(MODULES.PLANS, ACTIONS.UPDATE),
  (req, res, next) => planController.updatePlan(req, res, next)
);

router.patch(
  '/:id',
  requirePermission(MODULES.PLANS, ACTIONS.UPDATE),
  (req, res, next) => planController.updatePlan(req, res, next)
);

// Deactivate plan
router.delete(
  '/:id',
  requirePermission(MODULES.PLANS, ACTIONS.DELETE),
  (req, res, next) => planController.deletePlan(req, res, next)
);

module.exports = router;
