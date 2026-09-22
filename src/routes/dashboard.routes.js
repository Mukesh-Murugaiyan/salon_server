const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { MODULES, ACTIONS } = require('../constants/permissions');

const router = express.Router();

/**
 * GET /api/v1/dashboard/summary
 * Permission-driven: requires 'dashboard:view'
 */
router.get(
  '/summary',
  authenticate,
  requirePermission(MODULES.DASHBOARD, ACTIONS.VIEW),
  (req, res, next) => dashboardController.getSummary(req, res, next)
);

module.exports = router;
