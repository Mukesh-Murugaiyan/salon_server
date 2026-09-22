const express = require('express');
const attendanceController = require('../controllers/attendance.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { MODULES, ACTIONS } = require('../constants/permissions');

const router = express.Router();

router.use(authenticate);

// Check-in with server-side GPS geo-fencing calculation
router.post(
  '/check-in',
  requirePermission(MODULES.ATTENDANCE, ACTIONS.CHECK_IN),
  (req, res, next) => attendanceController.checkIn(req, res, next)
);

// Get current user's check-in status for today
router.get(
  '/today',
  requirePermission(MODULES.ATTENDANCE, ACTIONS.CHECK_IN),
  (req, res, next) => attendanceController.getTodayStatus(req, res, next)
);

// Get salon geo-fence coordinates and radius
router.get('/location', (req, res, next) =>
  attendanceController.getLocation(req, res, next)
);

// Update salon geo-fence coordinates and radius (Managers/Admins)
router.put(
  '/location',
  requirePermission(MODULES.COMPANIES, ACTIONS.UPDATE),
  (req, res, next) => attendanceController.updateLocation(req, res, next)
);

// List company attendance logs (Paginated, filterable)
router.get(
  '/',
  requirePermission(MODULES.ATTENDANCE, ACTIONS.VIEW),
  (req, res, next) => attendanceController.listAttendance(req, res, next)
);

// Get specific attendance record by ID
router.get(
  '/:id',
  requirePermission(MODULES.ATTENDANCE, ACTIONS.VIEW),
  (req, res, next) => attendanceController.getAttendance(req, res, next)
);

module.exports = router;
