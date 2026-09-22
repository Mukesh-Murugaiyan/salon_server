const mongoose = require('mongoose');

const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  OWNER: 'OWNER',
  RECEPTIONIST: 'RECEPTIONIST',
};

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
    role: {
      type: String,
      enum: {
        values: Object.values(ROLES),
        message: '{VALUE} is not a valid role',
      },
      required: [true, 'Role is required'],
      index: true,
    },
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      default: null,
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

// Server-side validation enforcing tenant/role business rules
userSchema.pre('validate', function (next) {
  if (this.role === ROLES.SUPER_ADMIN) {
    if (this.salonId !== null && this.salonId !== undefined) {
      this.invalidate('salonId', 'SUPER_ADMIN must not have a salonId assigned');
    }
  } else if (this.role === ROLES.OWNER || this.role === ROLES.RECEPTIONIST) {
    if (!this.salonId) {
      this.invalidate('salonId', `salonId is required for role ${this.role}`);
    }
  }
  next();
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = {
  User,
  ROLES,
};
