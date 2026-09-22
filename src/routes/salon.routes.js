const express = require('express');
const salonController = require('../controllers/salon.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { MODULES, ACTIONS } = require('../constants/permissions');

const router = express.Router();

/**
 * Salon Management Routes (Requires Global Tenant Access)
 * Protected by 'salons' module permissions.
 */

// Apply strict authentication to all salon routes
router.use(authenticate);

// List salons (accessible to admins with view access)
router.get(
  '/',
  requirePermission(MODULES.SALONS, ACTIONS.VIEW),
  (req, res, next) => salonController.listSalons(req, res, next)
);

// Get specific salon
router.get(
  '/:id',
  requirePermission(MODULES.SALONS, ACTIONS.VIEW),
  (req, res, next) => salonController.getSalon(req, res, next)
);

// Provision new salon
router.post(
  '/',
  requirePermission(MODULES.SALONS, ACTIONS.CREATE),
  (req, res, next) => salonController.createSalon(req, res, next)
);

// Update existing salon
router.put(
  '/:id',
  requirePermission(MODULES.SALONS, ACTIONS.UPDATE),
  (req, res, next) => salonController.updateSalon(req, res, next)
);

// Toggle salon active/inactive status
router.patch(
  '/:id/status',
  requirePermission(MODULES.SALONS, ACTIONS.UPDATE),
  (req, res, next) => salonController.toggleStatus(req, res, next)
);

// Manage Subscription (Assign/Change Plan)
router.post(
  '/:id/subscription',
  requirePermission(MODULES.SALONS, ACTIONS.UPDATE),
  (req, res, next) => salonController.manageSubscription(req, res, next)
);

// Renew Subscription
router.post(
  '/:id/subscription/renew',
  requirePermission(MODULES.SALONS, ACTIONS.UPDATE),
  (req, res, next) => salonController.renewSubscription(req, res, next)
);

// Remove Subscription
router.post(
  '/:id/subscription/remove',
  requirePermission(MODULES.SALONS, ACTIONS.UPDATE),
  (req, res, next) => salonController.removeSubscription(req, res, next)
);

module.exports = router;
