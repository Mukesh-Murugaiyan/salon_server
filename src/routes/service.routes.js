const express = require('express');
const serviceController = require('../controllers/service.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { MODULES, ACTIONS } = require('../constants/permissions');

const router = express.Router();

router.use(authenticate);

// List services strictly within company
router.get(
  '/',
  requirePermission(MODULES.SERVICES, ACTIONS.VIEW),
  (req, res, next) => serviceController.listServices(req, res, next)
);

// Get single service by ID
router.get(
  '/:id',
  requirePermission(MODULES.SERVICES, ACTIONS.VIEW),
  (req, res, next) => serviceController.getService(req, res, next)
);

// Create new service
router.post(
  '/',
  requirePermission(MODULES.SERVICES, ACTIONS.CREATE),
  (req, res, next) => serviceController.createService(req, res, next)
);

// Update service details
router.put(
  '/:id',
  requirePermission(MODULES.SERVICES, ACTIONS.UPDATE),
  (req, res, next) => serviceController.updateService(req, res, next)
);

router.patch(
  '/:id',
  requirePermission(MODULES.SERVICES, ACTIONS.UPDATE),
  (req, res, next) => serviceController.updateService(req, res, next)
);

// Toggle service active status
router.patch(
  '/:id/status',
  requirePermission(MODULES.SERVICES, ACTIONS.UPDATE),
  (req, res, next) => serviceController.toggleStatus(req, res, next)
);

// Delete (soft delete) service
router.delete(
  '/:id',
  requirePermission(MODULES.SERVICES, ACTIONS.DELETE),
  (req, res, next) => serviceController.deleteService(req, res, next)
);

module.exports = router;
