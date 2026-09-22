const appointmentService = require('../services/appointment.service');
const { getCompanyIdFromUser } = require('../utils/tenant');

class AppointmentController {
  /**
   * GET /api/v1/appointments
   */
  async listAppointments(req, res, next) {
    try {
      const companyId = getCompanyIdFromUser(req);
      const appointments = await appointmentService.listAppointments(companyId, req.query);

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
      const companyId = getCompanyIdFromUser(req);
      const appointment = await appointmentService.getAppointmentById(req.params.id, companyId);

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
      const companyId = getCompanyIdFromUser(req);
      const appointment = await appointmentService.createAppointment(companyId, req.body);

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
      const companyId = getCompanyIdFromUser(req);
      const appointment = await appointmentService.updateAppointment(req.params.id, companyId, req.body);

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
      const companyId = getCompanyIdFromUser(req);
      const result = await appointmentService.cancelAppointment(req.params.id, companyId);

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
      const companyId = getCompanyIdFromUser(req);
      const appointment = await appointmentService.updateStatus(
        req.params.id,
        companyId,
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
}

module.exports = new AppointmentController();
