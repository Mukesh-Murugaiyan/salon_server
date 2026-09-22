const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { MODULES, ACTIONS } = require('../constants/permissions');

const router = express.Router();

router.use(authenticate);

// List users strictly within user's company
router.get(
  '/',
  requirePermission(MODULES.USERS, ACTIONS.VIEW),
  (req, res, next) => userController.listUsers(req, res, next)
);

// Get single user by ID
router.get(
  '/:id',
  requirePermission(MODULES.USERS, ACTIONS.VIEW),
  (req, res, next) => userController.getUser(req, res, next)
);

// Create new user in company
router.post(
  '/',
  requirePermission(MODULES.USERS, ACTIONS.CREATE),
  (req, res, next) => userController.createUser(req, res, next)
);

// Update user details
router.put(
  '/:id',
  requirePermission(MODULES.USERS, ACTIONS.UPDATE),
  (req, res, next) => userController.updateUser(req, res, next)
);

router.patch(
  '/:id',
  requirePermission(MODULES.USERS, ACTIONS.UPDATE),
  (req, res, next) => userController.updateUser(req, res, next)
);

// Toggle user active status
router.patch(
  '/:id/status',
  requirePermission(MODULES.USERS, ACTIONS.UPDATE),
  (req, res, next) => userController.toggleStatus(req, res, next)
);

// Delete / deactivate user
router.delete(
  '/:id',
  requirePermission(MODULES.USERS, ACTIONS.DELETE),
  (req, res, next) => userController.deleteUser(req, res, next)
);

module.exports = router;
