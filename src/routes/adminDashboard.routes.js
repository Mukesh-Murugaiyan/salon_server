const express = require('express');
const adminDashboardController = require('../controllers/adminDashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { MODULES, ACTIONS } = require('../constants/permissions');

const router = express.Router();

/**
 * GET /api/v1/admin/dashboard/summary
 * Permission-driven: requires 'dashboard:view'
 */
router.get(
  '/dashboard/summary',
  authenticate,
  requirePermission(MODULES.DASHBOARD, ACTIONS.VIEW),
  (req, res, next) => adminDashboardController.getSummary(req, res, next)
);

module.exports = router;
