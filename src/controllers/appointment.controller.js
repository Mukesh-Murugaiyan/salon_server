const appointmentService = require('../services/appointment.service');
const { getSalonIdFromUser } = require('../utils/tenant');

class AppointmentController {
  /**
   * GET /api/v1/appointments
   */
  async listAppointments(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const appointments = await appointmentService.listAppointments(salonId, req.query);

      return res.status(200).json({
        success: true,
        appointments,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/appointments/:id
   */
  async getAppointment(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const appointment = await appointmentService.getAppointmentById(req.params.id, salonId);

      return res.status(200).json({
        success: true,
        appointment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/appointments
   */
  async createAppointment(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const appointment = await appointmentService.createAppointment(salonId, req.body);

      return res.status(201).json({
        success: true,
        appointment,
        message: 'Appointment booked successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/appointments/:id
   */
  async updateAppointment(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const appointment = await appointmentService.updateAppointment(req.params.id, salonId, req.body);

      return res.status(200).json({
        success: true,
        appointment,
        message: 'Appointment updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/appointments/:id
   */
  async deleteAppointment(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const result = await appointmentService.cancelAppointment(req.params.id, salonId);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/appointments/:id/status
   */
  async updateStatus(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const appointment = await appointmentService.updateStatus(
        req.params.id,
        salonId,
        req.body.status
      );

      return res.status(200).json({
        success: true,
        appointment,
        message: `Appointment status updated to ${appointment.status}.`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/appointments/readiness
   * Returns DB-level active counts for clients, staff, and services.
   * Used by the Appointments page to determine if booking is possible
   * without fetching full resource lists.
   * Requires: appointments:create permission (it's an appointments-domain endpoint)
   */
  async getReadiness(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const readiness = await appointmentService.getReadiness(salonId);

      return res.status(200).json({
        success: true,
        ...readiness,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/appointments/form-data
   * Returns minimal id+name projection for clients, staff, and services —
   * only what is needed to populate booking form dropdowns.
   * Requires: appointments:create permission.
   */
  async getFormData(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const formData = await appointmentService.getFormData(salonId);

      return res.status(200).json({
        success: true,
        ...formData,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AppointmentController();
