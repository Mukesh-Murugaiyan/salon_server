const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required for a role'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
      minlength: [2, 'Role name must be at least 2 characters'],
      maxlength: [80, 'Role name must not exceed 80 characters'],
    },
    code: {
      type: String,
      required: [true, 'Role code is required'],
      uppercase: true,
      trim: true,
      minlength: [2, 'Role code must be at least 2 characters'],
      maxlength: [50, 'Role code must not exceed 50 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [255, 'Description must not exceed 255 characters'],
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique role code within a specific company
roleSchema.index({ companyId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Role', roleSchema);
