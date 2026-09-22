const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [2, 'Company name must be at least 2 characters'],
      maxlength: [120, 'Company name must not exceed 120 characters'],
    },
    code: {
      type: String,
      required: [true, 'Company code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      minlength: [2, 'Company code must be at least 2 characters'],
      maxlength: [30, 'Company code must not exceed 30 characters'],
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
      enum: ['ACTIVE', 'EXPIRED'],
      default: 'EXPIRED',
      index: true,
    },
    // Ticket 9 Geo-Fencing Location Fields
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
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

module.exports = mongoose.model('Company', companySchema);
