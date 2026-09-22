const express = require('express');
const staffController = require('../controllers/staff.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { MODULES, ACTIONS } = require('../constants/permissions');

const router = express.Router();

router.use(authenticate);

// List staff members strictly within company
router.get(
  '/',
  requirePermission(MODULES.STAFF, ACTIONS.VIEW),
  (req, res, next) => staffController.listStaff(req, res, next)
);

// Get single staff member by ID
router.get(
  '/:id',
  requirePermission(MODULES.STAFF, ACTIONS.VIEW),
  (req, res, next) => staffController.getStaff(req, res, next)
);

// Create new staff member
router.post(
  '/',
  requirePermission(MODULES.STAFF, ACTIONS.CREATE),
  (req, res, next) => staffController.createStaff(req, res, next)
);

// Update staff details
router.put(
  '/:id',
  requirePermission(MODULES.STAFF, ACTIONS.UPDATE),
  (req, res, next) => staffController.updateStaff(req, res, next)
);

router.patch(
  '/:id',
  requirePermission(MODULES.STAFF, ACTIONS.UPDATE),
  (req, res, next) => staffController.updateStaff(req, res, next)
);

// Toggle staff active status
router.patch(
  '/:id/status',
  requirePermission(MODULES.STAFF, ACTIONS.UPDATE),
  (req, res, next) => staffController.toggleStatus(req, res, next)
);

// Soft delete staff member
router.delete(
  '/:id',
  requirePermission(MODULES.STAFF, ACTIONS.DELETE),
  (req, res, next) => staffController.deleteStaff(req, res, next)
);

module.exports = router;
