const express = require('express');
const appointmentController = require('../controllers/appointment.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { MODULES, ACTIONS } = require('../constants/permissions');

const router = express.Router();

router.use(authenticate);

// ─── Purpose-specific aggregate endpoints (MUST be before /:id) ────────────

/**
 * GET /api/v1/appointments/readiness
 * Returns DB-level active counts (clientsCount, staffCount, servicesCount, canBook).
 * Permission: appointments:create — this is an appointment-domain endpoint.
 * Does NOT require staff:view or services:view.
 */
router.get(
  '/readiness',
  requirePermission(MODULES.APPOINTMENTS, ACTIONS.CREATE),
  (req, res, next) => appointmentController.getReadiness(req, res, next)
);

/**
 * GET /api/v1/appointments/form-data
 * Returns minimal id+name lists for booking form dropdowns (clients, staff, services).
 * Permission: appointments:create — same domain, same audience.
 * Does NOT require staff:view or services:view.
 */
router.get(
  '/form-data',
  requirePermission(MODULES.APPOINTMENTS, ACTIONS.CREATE),
  (req, res, next) => appointmentController.getFormData(req, res, next)
);

// ─── Standard CRUD routes ────────────────────────────────────────────────────

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
