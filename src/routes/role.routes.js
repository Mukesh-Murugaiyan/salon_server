const express = require('express');
const roleController = require('../controllers/role.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { MODULES, ACTIONS } = require('../constants/permissions');

const router = express.Router();

// All role routes require authentication
router.use(authenticate);

// List roles
router.get(
  '/',
  requirePermission(MODULES.ROLES, ACTIONS.VIEW),
  (req, res, next) => roleController.listRoles(req, res, next)
);

// Create new role
router.post(
  '/',
  requirePermission(MODULES.ROLES, ACTIONS.CREATE),
  (req, res, next) => roleController.createRole(req, res, next)
);

// Get role permissions & catalog
router.get(
  '/:id/permissions',
  requirePermission(MODULES.ROLES, ACTIONS.VIEW),
  (req, res, next) => roleController.getRolePermissions(req, res, next)
);

// Update role permissions
router.put(
  '/:id/permissions',
  requirePermission(MODULES.ROLES, ACTIONS.UPDATE),
  (req, res, next) => roleController.updateRolePermissions(req, res, next)
);

// Get single role details
router.get(
  '/:id',
  requirePermission(MODULES.ROLES, ACTIONS.VIEW),
  (req, res, next) => roleController.getRole(req, res, next)
);

// Update role metadata
router.put(
  '/:id',
  requirePermission(MODULES.ROLES, ACTIONS.UPDATE),
  (req, res, next) => roleController.updateRole(req, res, next)
);

// Delete role
router.delete(
  '/:id',
  requirePermission(MODULES.ROLES, ACTIONS.DELETE),
  (req, res, next) => roleController.deleteRole(req, res, next)
);

module.exports = router;
