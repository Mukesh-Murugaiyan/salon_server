const express = require('express');
const appointmentController = require('../controllers/appointment.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { MODULES, ACTIONS } = require('../constants/permissions');

const router = express.Router();

router.use(authenticate);

// List appointments strictly within company
router.get(
  '/',
  requirePermission(MODULES.APPOINTMENTS, ACTIONS.VIEW),
  (req, res, next) => appointmentController.listAppointments(req, res, next)
);

// Get single appointment by ID
router.get(
  '/:id',
  requirePermission(MODULES.APPOINTMENTS, ACTIONS.VIEW),
  (req, res, next) => appointmentController.getAppointment(req, res, next)
);

// Book new appointment
router.post(
  '/',
  requirePermission(MODULES.APPOINTMENTS, ACTIONS.CREATE),
  (req, res, next) => appointmentController.createAppointment(req, res, next)
);

// Update appointment details
router.put(
  '/:id',
  requirePermission(MODULES.APPOINTMENTS, ACTIONS.UPDATE),
  (req, res, next) => appointmentController.updateAppointment(req, res, next)
);

router.patch(
  '/:id',
  requirePermission(MODULES.APPOINTMENTS, ACTIONS.UPDATE),
  (req, res, next) => appointmentController.updateAppointment(req, res, next)
);

// Update appointment status
router.patch(
  '/:id/status',
  requirePermission(MODULES.APPOINTMENTS, ACTIONS.UPDATE),
  (req, res, next) => appointmentController.updateStatus(req, res, next)
);

// Cancel / delete appointment
router.delete(
  '/:id',
  requirePermission(MODULES.APPOINTMENTS, ACTIONS.DELETE),
  (req, res, next) => appointmentController.deleteAppointment(req, res, next)
);

module.exports = router;
