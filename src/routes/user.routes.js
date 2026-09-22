const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');
const { ROLES } = require('../models/user.model');

const router = express.Router();

// List users (Scoped by tenant for salon roles; global for SUPER_ADMIN)
router.get(
  '/',
  authenticate,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.RECEPTIONIST),
  (req, res, next) => userController.listUsers(req, res, next)
);

// Get single user by ID
router.get(
  '/:id',
  authenticate,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.RECEPTIONIST),
  (req, res, next) => userController.getUser(req, res, next)
);

// Provision new user (Staff creation restricted to OWNER & SUPER_ADMIN)
router.post(
  '/',
  authenticate,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.OWNER),
  (req, res, next) => userController.createUser(req, res, next)
);

// Update user details
router.patch(
  '/:id',
  authenticate,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.OWNER),
  (req, res, next) => userController.updateUser(req, res, next)
);

// Toggle account active status (enable/disable)
router.patch(
  '/:id/status',
  authenticate,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.OWNER),
  (req, res, next) => userController.toggleStatus(req, res, next)
);

module.exports = router;
