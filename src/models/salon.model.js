const mongoose = require('mongoose');

const salonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Salon name is required'],
      trim: true,
      minlength: [2, 'Salon name must be at least 2 characters'],
      maxlength: [100, 'Salon name must not exceed 100 characters'],
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
  },
  {
    timestamps: true,
  }
);

const Salon = mongoose.models.Salon || mongoose.model('Salon', salonSchema);

module.exports = Salon;
