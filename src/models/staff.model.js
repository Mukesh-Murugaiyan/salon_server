const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Staff name is required'],
      trim: true,
      minlength: [2, 'Staff name must be at least 2 characters'],
      maxlength: [100, 'Staff name must not exceed 100 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Staff phone number is required'],
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
    title: {
      type: String,
      required: [true, 'Staff title/position is required'],
      trim: true,
      maxlength: [100, 'Title must not exceed 100 characters'],
    },
    specialization: {
      type: String,
      trim: true,
      maxlength: [255, 'Specialization must not exceed 255 characters'],
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

// Compound indexes for fast tenant lookups and validation
staffSchema.index({ companyId: 1, phone: 1 });
staffSchema.index({ companyId: 1, name: 1 });
staffSchema.index({ companyId: 1, isActive: 1 });

const Staff = mongoose.models.Staff || mongoose.model('Staff', staffSchema);

module.exports = Staff;
