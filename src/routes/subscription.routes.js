const express = require('express');
const subscriptionController = require('../controllers/subscription.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { MODULES, ACTIONS } = require('../constants/permissions');

const router = express.Router();

router.use(authenticate);

// Get current subscription status, limits, and usage
router.get(
  '/',
  requirePermission(MODULES.SUBSCRIPTION, ACTIONS.VIEW),
  (req, res, next) => subscriptionController.getCurrentSubscription(req, res, next)
);

// Assign plan
router.post(
  '/assign',
  requirePermission(MODULES.SUBSCRIPTION, ACTIONS.ASSIGN),
  (req, res, next) => subscriptionController.assignPlan(req, res, next)
);

// Renew subscription
router.post(
  '/renew',
  requirePermission(MODULES.SUBSCRIPTION, ACTIONS.RENEW),
  (req, res, next) => subscriptionController.renewSubscription(req, res, next)
);

// Upgrade plan
router.post(
  '/upgrade',
  requirePermission(MODULES.SUBSCRIPTION, ACTIONS.UPGRADE),
  (req, res, next) => subscriptionController.upgradePlan(req, res, next)
);

// Get subscription audit history
router.get(
  '/history',
  requirePermission(MODULES.SUBSCRIPTION, ACTIONS.HISTORY),
  (req, res, next) => subscriptionController.getSubscriptionHistory(req, res, next)
);

module.exports = router;
