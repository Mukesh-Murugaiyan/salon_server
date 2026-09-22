const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Plan name must be at least 2 characters'],
      maxlength: [100, 'Plan name must not exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description must not exceed 500 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be a non-negative number'],
    },
    durationInDays: {
      type: Number,
      required: [true, 'Duration in days is required'],
      min: [1, 'Duration must be at least 1 day'],
    },
    maxStaff: {
      type: Number,
      required: [true, 'Max staff limit is required'],
      min: [1, 'Max staff must be at least 1'],
    },
    maxAppointments: {
      type: Number,
      required: [true, 'Max appointments limit is required'],
      min: [1, 'Max appointments must be at least 1'],
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

const Plan = mongoose.models.Plan || mongoose.model('Plan', planSchema);

module.exports = Plan;
