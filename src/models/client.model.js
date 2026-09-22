const mongoose = require('mongoose');
const { GENDER_VALUES } = require('../constants/client.constants');

const clientSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      match: [/^(|\S+@\S+\.\S+)$/, 'Please provide a valid email address'],
    },
    gender: {
      type: String,
      enum: {
        values: GENDER_VALUES,
        message: '{VALUE} is not a valid gender option',
      },
      default: 'PREFER_NOT_TO_SAY',
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes must not exceed 1000 characters'],
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast tenant-scoped lookups
clientSchema.index({ companyId: 1, phone: 1 });
clientSchema.index({ companyId: 1, name: 1 });
clientSchema.index({ companyId: 1, isActive: 1 });

// Backward compatibility alias for existing code referencing salonId
clientSchema.virtual('salonId').get(function () {
  return this.companyId;
});

const Client = mongoose.models.Client || mongoose.model('Client', clientSchema);

module.exports = Client;
