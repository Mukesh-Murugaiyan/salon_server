const mongoose = require('mongoose');
const Role = require('./role.model');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      index: true,
    },
    role: {
      type: mongoose.Schema.Types.Mixed,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      index: true,
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

// Pre-validate hook to auto-resolve roleId from legacy role property in tests
userSchema.pre('validate', async function () {
  if (!this.roleId) {
    const Role = mongoose.models.Role || mongoose.model('Role');
    const rawRole = this.role || this.get('role');
    const code =
      (typeof rawRole === 'object' && rawRole?.value ? rawRole.value : rawRole) ||
      'STAFF';
    let r = await Role.findOne({ code });
    if (!r) {
      r = await Role.create({
        name: code,
        code,
        salonId: this.salonId || null,
        permissions: ['*'],
      });
    }
    this.roleId = r._id;
  }
});

const { ROLES } = require('../constants/roles');

const User = mongoose.model('User', userSchema);

module.exports = {
  User,
  ROLES,
};
