const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: [true, 'Salon ID is required'],
      index: true,
    },
    clientName: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
    },
    serviceName: {
      type: String,
      trim: true,
      default: 'Haircut & Styling',
    },
    date: {
      type: Date,
      required: [true, 'Appointment date is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['CONFIRMED', 'PENDING', 'CANCELLED', 'COMPLETED'],
      default: 'CONFIRMED',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
