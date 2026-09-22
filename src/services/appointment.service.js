const Appointment = require('../models/appointment.model');
const Client = require('../models/client.model');
const Staff = require('../models/staff.model');
const Service = require('../models/service.model');
const subscriptionService = require('./subscription.service');
const {
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUSES,
  BUSINESS_HOURS,
  timeToMinutes,
  minutesToTime,
} = require('../constants/appointment.constants');

class AppointmentService {
  /**
   * Validates cross-entity company isolation and active status for Client, Staff, and Service.
   *
   * @private
   * @param {string} companyId
   * @param {string} clientId
   * @param {string} staffId
   * @param {string} serviceId
   * @returns {Promise<{ client: Object, staff: Object, service: Object }>}
   */
  async _validateEntities(companyId, clientId, staffId, serviceId) {
    const [client, staff, service] = await Promise.all([
      Client.findOne({ _id: clientId, companyId }),
      Staff.findOne({ _id: staffId, companyId }),
      Service.findOne({ _id: serviceId, companyId }),
    ]);

    if (!client) {
      const err = new Error('Client not found or does not belong to your company.');
      err.status = 404;
      err.code = 'CLIENT_NOT_FOUND';
      throw err;
    }
    if (!client.isActive) {
      const err = new Error(`Client '${client.name}' is inactive and cannot be booked.`);
      err.status = 400;
      err.code = 'CLIENT_INACTIVE';
      throw err;
    }

    if (!staff) {
      const err = new Error('Staff member not found or does not belong to your company.');
      err.status = 404;
      err.code = 'STAFF_NOT_FOUND';
      throw err;
    }
    if (!staff.isActive) {
      const err = new Error(`Staff member '${staff.name}' is inactive and cannot be assigned.`);
      err.status = 400;
      err.code = 'STAFF_INACTIVE';
      throw err;
    }

    if (!service) {
      const err = new Error('Service not found or does not belong to your company.');
      err.status = 404;
      err.code = 'SERVICE_NOT_FOUND';
      throw err;
    }
    if (!service.isActive) {
      const err = new Error(`Service '${service.name}' is inactive and cannot be booked.`);
      err.status = 400;
      err.code = 'SERVICE_INACTIVE';
      throw err;
    }

    return { client, staff, service };
  }

  /**
   * Validates business hours (09:00 - 20:00) and service duration alignment.
   *
   * @private
   * @param {string} startTime
   * @param {string} [endTime]
   * @param {number} serviceDurationInMinutes
   * @returns {{ startTime: string, endTime: string }}
   */
  _validateTiming(startTime, endTime, serviceDurationInMinutes) {
    const startMins = timeToMinutes(startTime);
    if (isNaN(startMins)) {
      const err = new Error("Start time must be formatted as 'HH:mm'.");
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    let endMins;
    if (endTime) {
      endMins = timeToMinutes(endTime);
      if (isNaN(endMins)) {
        const err = new Error("End time must be formatted as 'HH:mm'.");
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      if (endMins <= startMins) {
        const err = new Error('Start time must be before end time.');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      const requestedDuration = endMins - startMins;
      if (requestedDuration !== serviceDurationInMinutes) {
        const err = new Error(
          `Requested duration (${requestedDuration} mins) does not match the service duration (${serviceDurationInMinutes} mins).`
        );
        err.status = 400;
        err.code = 'DURATION_MISMATCH';
        throw err;
      }
    } else {
      endMins = startMins + serviceDurationInMinutes;
      endTime = minutesToTime(endMins);
    }

    // Validate Business Hours (09:00 - 20:00)
    if (startMins < BUSINESS_HOURS.START_MINUTES || endMins > BUSINESS_HOURS.END_MINUTES) {
      const err = new Error(
        `Appointment must be scheduled completely within business hours (${BUSINESS_HOURS.START}–${BUSINESS_HOURS.END}).`
      );
      err.status = 400;
      err.code = 'OUTSIDE_BUSINESS_HOURS';
      throw err;
    }

    return { startTime, endTime };
  }

  /**
   * Checks for overlapping active appointments for the specified staff member on a date.
   * Cancelled appointments are strictly excluded.
   *
   * @private
   * @param {string} companyId
   * @param {string} staffId
   * @param {string} date
   * @param {string} startTime
   * @param {string} endTime
   * @param {string} [excludeAppointmentId=null]
   */
  async _checkStaffOverlap(companyId, staffId, date, startTime, endTime, excludeAppointmentId = null) {
    const query = {
      companyId,
      staffId,
      date,
      status: { $ne: APPOINTMENT_STATUS.CANCELLED },
    };

    if (excludeAppointmentId) {
      query._id = { $ne: excludeAppointmentId };
    }

    const existingAppointments = await Appointment.find(query);
    const requestedStart = timeToMinutes(startTime);
    const requestedEnd = timeToMinutes(endTime);

    for (const app of existingAppointments) {
      const existingStart = timeToMinutes(app.startTime);
      const existingEnd = timeToMinutes(app.endTime);

      // Overlap formula: existing.start < requested.end AND existing.end > requested.start
      if (existingStart < requestedEnd && existingEnd > requestedStart) {
        const err = new Error(
          `Schedule conflict: The staff member already has an active appointment (${app.startTime}–${app.endTime}) on ${date}.`
        );
        err.status = 409;
        err.code = 'STAFF_OVERLAP_CONFLICT';
        throw err;
      }
    }
  }

  /**
   * Lists appointments scoped to company with optional filtering.
   *
   * @param {string} companyId
   * @param {Object} [filter={}]
   * @returns {Promise<Array<Object>>}
   */
  async listAppointments(companyId, filter = {}) {
    const query = { companyId };

    if (filter.date) {
      query.date = filter.date;
    }

    if (filter.staffId) {
      query.staffId = filter.staffId;
    }

    if (filter.clientId) {
      query.clientId = filter.clientId;
    }

    if (filter.status && filter.status !== 'all') {
      query.status = filter.status.toUpperCase();
    }

    const appointments = await Appointment.find(query)
      .populate('clientId', 'name phone email')
      .populate('staffId', 'name title specialization')
      .populate('serviceId', 'name durationInMinutes price')
      .sort({ date: -1, startTime: 1 });

    return appointments.map((a) => ({
      id: a._id.toString(),
      _id: a._id.toString(),
      companyId: a.companyId,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      notes: a.notes || '',
      client: a.clientId
        ? {
            id: a.clientId._id.toString(),
            _id: a.clientId._id.toString(),
            name: a.clientId.name,
            phone: a.clientId.phone,
            email: a.clientId.email,
          }
        : null,
      staff: a.staffId
        ? {
            id: a.staffId._id.toString(),
            _id: a.staffId._id.toString(),
            name: a.staffId.name,
            title: a.staffId.title,
            specialization: a.staffId.specialization,
          }
        : null,
      service: a.serviceId
        ? {
            id: a.serviceId._id.toString(),
            _id: a.serviceId._id.toString(),
            name: a.serviceId.name,
            durationInMinutes: a.serviceId.durationInMinutes,
            price: a.serviceId.price,
          }
        : null,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  }

  /**
   * Retrieves single appointment by ID within company boundary.
   *
   * @param {string} appointmentId
   * @param {string} companyId
   * @returns {Promise<Object>}
   */
  async getAppointmentById(appointmentId, companyId) {
    const app = await Appointment.findOne({ _id: appointmentId, companyId })
      .populate('clientId', 'name phone email')
      .populate('staffId', 'name title specialization')
      .populate('serviceId', 'name durationInMinutes price');

    if (!app) {
      const err = new Error('Appointment not found or does not belong to your company.');
      err.status = 404;
      err.code = 'APPOINTMENT_NOT_FOUND';
      throw err;
    }

    return {
      id: app._id.toString(),
      _id: app._id.toString(),
      companyId: app.companyId,
      date: app.date,
      startTime: app.startTime,
      endTime: app.endTime,
      status: app.status,
      notes: app.notes || '',
      client: app.clientId
        ? {
            id: app.clientId._id.toString(),
            _id: app.clientId._id.toString(),
            name: app.clientId.name,
            phone: app.clientId.phone,
            email: app.clientId.email,
          }
        : null,
      staff: app.staffId
        ? {
            id: app.staffId._id.toString(),
            _id: app.staffId._id.toString(),
            name: app.staffId.name,
            title: app.staffId.title,
            specialization: app.staffId.specialization,
          }
        : null,
      service: app.serviceId
        ? {
            id: app.serviceId._id.toString(),
            _id: app.serviceId._id.toString(),
            name: app.serviceId.name,
            durationInMinutes: app.serviceId.durationInMinutes,
            price: app.serviceId.price,
          }
        : null,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
  }

  /**
   * Schedules a new appointment.
   *
   * @param {string} companyId
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createAppointment(companyId, data) {
    const { clientId, staffId, serviceId, date, startTime, endTime, notes, status } = data;

    if (!clientId || !staffId || !serviceId || !date || !startTime) {
      const err = new Error('Client, Staff, Service, Date, and Start Time are required fields.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // 0. Enforce active subscription and appointment quota limit
    await subscriptionService.validateAppointmentLimit(companyId);

    // 1. Verify cross-entity tenant isolation and active status
    const { client, staff, service } = await this._validateEntities(companyId, clientId, staffId, serviceId);

    // 2. Validate timing and business hours
    const timing = this._validateTiming(startTime, endTime, service.durationInMinutes);

    // 3. Prevent overlapping active bookings for this staff member
    await this._checkStaffOverlap(companyId, staffId, date, timing.startTime, timing.endTime);

    // 4. Validate initial status
    const appStatus = status ? status.toUpperCase() : APPOINTMENT_STATUS.CONFIRMED;
    if (!APPOINTMENT_STATUSES.includes(appStatus)) {
      const err = new Error(`Invalid status '${status}'. Must be one of: ${APPOINTMENT_STATUSES.join(', ')}.`);
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // 5. Create appointment
    const appointment = await Appointment.create({
      companyId,
      clientId,
      staffId,
      serviceId,
      date,
      startTime: timing.startTime,
      endTime: timing.endTime,
      status: appStatus,
      notes: (notes || '').trim(),
    });

    return this.getAppointmentById(appointment._id, companyId);
  }

  /**
   * Updates an existing appointment.
   *
   * @param {string} appointmentId
   * @param {string} companyId
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async updateAppointment(appointmentId, companyId, data) {
    const appointment = await Appointment.findOne({ _id: appointmentId, companyId });
    if (!appointment) {
      const err = new Error('Appointment not found or does not belong to your company.');
      err.status = 404;
      err.code = 'APPOINTMENT_NOT_FOUND';
      throw err;
    }

    const clientId = data.clientId || appointment.clientId;
    const staffId = data.staffId || appointment.staffId;
    const serviceId = data.serviceId || appointment.serviceId;
    const date = data.date || appointment.date;
    const startTime = data.startTime || appointment.startTime;
    const requestedEndTime = data.endTime;

    // 1. Validate entities
    const { service } = await this._validateEntities(companyId, clientId, staffId, serviceId);

    // 2. Validate timing
    const timing = this._validateTiming(startTime, requestedEndTime, service.durationInMinutes);

    // 3. Overlap check (if status is not CANCELLED)
    const targetStatus = data.status ? data.status.toUpperCase() : appointment.status;
    if (targetStatus !== APPOINTMENT_STATUS.CANCELLED) {
      await this._checkStaffOverlap(
        companyId,
        staffId,
        date,
        timing.startTime,
        timing.endTime,
        appointmentId
      );
    }

    if (data.status) {
      if (!APPOINTMENT_STATUSES.includes(targetStatus)) {
        const err = new Error(`Invalid status '${data.status}'.`);
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      appointment.status = targetStatus;
    }

    appointment.clientId = clientId;
    appointment.staffId = staffId;
    appointment.serviceId = serviceId;
    appointment.date = date;
    appointment.startTime = timing.startTime;
    appointment.endTime = timing.endTime;

    if (data.notes !== undefined) {
      appointment.notes = data.notes.trim();
    }

    await appointment.save();

    return this.getAppointmentById(appointmentId, companyId);
  }

  /**
   * Cancels an appointment (status = 'CANCELLED').
   * Cancelled appointments do not block staff scheduling.
   *
   * @param {string} appointmentId
   * @param {string} companyId
   * @returns {Promise<Object>}
   */
  async cancelAppointment(appointmentId, companyId) {
    const appointment = await Appointment.findOne({ _id: appointmentId, companyId });
    if (!appointment) {
      const err = new Error('Appointment not found or does not belong to your company.');
      err.status = 404;
      err.code = 'APPOINTMENT_NOT_FOUND';
      throw err;
    }

    appointment.status = APPOINTMENT_STATUS.CANCELLED;
    await appointment.save();

    return {
      id: appointment._id.toString(),
      _id: appointment._id.toString(),
      status: APPOINTMENT_STATUS.CANCELLED,
      message: 'Appointment cancelled successfully.',
    };
  }

  /**
   * Updates status of an appointment (PENDING, CONFIRMED, COMPLETED, CANCELLED).
   *
   * @param {string} appointmentId
   * @param {string} companyId
   * @param {string} newStatus
   * @returns {Promise<Object>}
   */
  async updateStatus(appointmentId, companyId, newStatus) {
    const normalized = (newStatus || '').toUpperCase();
    if (!APPOINTMENT_STATUSES.includes(normalized)) {
      const err = new Error(`Invalid status '${newStatus}'. Must be one of: ${APPOINTMENT_STATUSES.join(', ')}.`);
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const appointment = await Appointment.findOne({ _id: appointmentId, companyId });
    if (!appointment) {
      const err = new Error('Appointment not found or does not belong to your company.');
      err.status = 404;
      err.code = 'APPOINTMENT_NOT_FOUND';
      throw err;
    }

    // If un-cancelling, verify overlap protection
    if (appointment.status === APPOINTMENT_STATUS.CANCELLED && normalized !== APPOINTMENT_STATUS.CANCELLED) {
      await this._checkStaffOverlap(
        companyId,
        appointment.staffId,
        appointment.date,
        appointment.startTime,
        appointment.endTime,
        appointmentId
      );
    }

    appointment.status = normalized;
    await appointment.save();

    return this.getAppointmentById(appointmentId, companyId);
  }
}

module.exports = new AppointmentService();
