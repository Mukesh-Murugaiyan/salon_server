const express = require('express');
const clientController = require('../controllers/client.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { MODULES, ACTIONS } = require('../constants/permissions');

const router = express.Router();

router.use(authenticate);

// List clients strictly within authenticated company
router.get(
  '/',
  requirePermission(MODULES.CLIENTS, ACTIONS.VIEW),
  (req, res, next) => clientController.listClients(req, res, next)
);

// Get single client by ID
router.get(
  '/:id',
  requirePermission(MODULES.CLIENTS, ACTIONS.VIEW),
  (req, res, next) => clientController.getClient(req, res, next)
);

// Create new client record
router.post(
  '/',
  requirePermission(MODULES.CLIENTS, ACTIONS.CREATE),
  (req, res, next) => clientController.createClient(req, res, next)
);

// Update client details
router.put(
  '/:id',
  requirePermission(MODULES.CLIENTS, ACTIONS.UPDATE),
  (req, res, next) => clientController.updateClient(req, res, next)
);

router.patch(
  '/:id',
  requirePermission(MODULES.CLIENTS, ACTIONS.UPDATE),
  (req, res, next) => clientController.updateClient(req, res, next)
);

// Toggle client active status
router.patch(
  '/:id/status',
  requirePermission(MODULES.CLIENTS, ACTIONS.UPDATE),
  (req, res, next) => clientController.toggleStatus(req, res, next)
);

// Soft delete client
router.delete(
  '/:id',
  requirePermission(MODULES.CLIENTS, ACTIONS.DELETE),
  (req, res, next) => clientController.deleteClient(req, res, next)
);

module.exports = router;
