const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
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
      type: Number,
      required: [true, 'Check-in latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90'],
    },
    longitude: {
      type: Number,
      required: [true, 'Check-in longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180'],
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

// Compound unique index ensuring one check-in per user per company per day
attendanceSchema.index({ companyId: 1, userId: 1, date: 1 }, { unique: true });

// Multi-tenant query indexes
attendanceSchema.index({ companyId: 1, date: 1 });
attendanceSchema.index({ companyId: 1, status: 1 });

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
