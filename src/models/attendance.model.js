const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: [true, 'Salon ID is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: [true, 'Attendance date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
      index: true,
    },
    checkInTime: {
      type: Date,
      default: Date.now,
      required: [true, 'Check-in time is required'],
    },
    latitude: {
      type: String,
      required: [true, 'Check-in latitude is required'],
    },
    longitude: {
      type: String,
      required: [true, 'Check-in longitude is required'],
    },
    distanceFromSalon: {
      type: Number,
      required: [true, 'Distance from salon is required'],
      min: [0, 'Distance must be a non-negative number'],
    },
    status: {
      type: String,
      enum: ['PRESENT', 'LATE', 'HALF_DAY'],
      default: 'PRESENT',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring one check-in per user per salon per day
attendanceSchema.index({ salonId: 1, userId: 1, date: 1 }, { unique: true });

// Multi-tenant query indexes
attendanceSchema.index({ salonId: 1, date: 1 });
attendanceSchema.index({ salonId: 1, status: 1 });

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
