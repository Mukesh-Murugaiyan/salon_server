const mongoose = require('mongoose');

const salonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Salon name is required'],
      trim: true,
      minlength: [2, 'Salon name must be at least 2 characters'],
      maxlength: [120, 'Salon name must not exceed 120 characters'],
    },
    code: {
      type: String,
      required: [true, 'Salon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      minlength: [2, 'Salon code must be at least 2 characters'],
      maxlength: [30, 'Salon code must not exceed 30 characters'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Ticket 8 Subscription Management Fields
    currentPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      default: null,
    },
    subscriptionStartDate: {
      type: Date,
      default: null,
    },
    subscriptionEndDate: {
      type: Date,
      default: null,
    },
    subscriptionStatus: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'TRIAL'],
      default: 'EXPIRED',
      index: true,
    },
    // Ticket 9 Geo-Fencing Location Fields
    latitude: {
      type: String,
      default: null,
    },
    longitude: {
      type: String,
      default: null,
    },
    allowedRadiusInMeters: {
      type: Number,
      default: 100,
      min: [1, 'Allowed radius must be at least 1 meter'],
    },
  },
  {
    timestamps: true,
  }
);

const Salon = mongoose.models.Salon || mongoose.model('Salon', salonSchema);

module.exports = Salon;
