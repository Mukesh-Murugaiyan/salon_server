const mongoose = require('mongoose');

/**
 * Service Model
 * Represents a salon service offered by a specific company tenant.
 * Completely database-driven and company-specific (no hardcoded services).
 */
const serviceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      minlength: [2, 'Service name must be at least 2 characters'],
      maxlength: [120, 'Service name must not exceed 120 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description must not exceed 500 characters'],
    },
    durationInMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [1, 'Duration must be at least 1 minute'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be a valid non-negative number'],
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

// Compound indexes for fast tenant queries and uniqueness validation
serviceSchema.index({ companyId: 1, name: 1 });
serviceSchema.index({ companyId: 1, isActive: 1 });

const Service = mongoose.models.Service || mongoose.model('Service', serviceSchema);

module.exports = Service;
