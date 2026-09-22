const mongoose = require('mongoose');
const { APPOINTMENT_STATUS, APPOINTMENT_STATUSES } = require('../constants/appointment.constants');

const appointmentSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: [true, 'Salon ID is required'],
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client ID is required'],
      index: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service ID is required'],
      index: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: [true, 'Staff ID is required'],
      index: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: [true, 'Appointment date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
      index: true,
    },
    startTime: {
      type: String, // Format: HH:mm
      required: [true, 'Start time is required (HH:mm)'],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Start time must be formatted as HH:mm'],
    },
    endTime: {
      type: String, // Format: HH:mm
      required: [true, 'End time is required (HH:mm)'],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'End time must be formatted as HH:mm'],
    },
    status: {
      type: String,
      enum: APPOINTMENT_STATUSES,
      default: APPOINTMENT_STATUS.CONFIRMED,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for rapid tenant lookups, date filtering, and staff scheduling queries
appointmentSchema.index({ salonId: 1, date: 1 });
appointmentSchema.index({ salonId: 1, staffId: 1, date: 1 });
appointmentSchema.index({ salonId: 1, clientId: 1 });
appointmentSchema.index({ salonId: 1, status: 1 });

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
