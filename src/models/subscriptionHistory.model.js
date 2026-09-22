const mongoose = require('mongoose');

const subscriptionHistorySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: [true, 'Plan ID is required'],
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be a non-negative number'],
    },
    action: {
      type: String,
      enum: ['ASSIGN', 'RENEW', 'UPGRADE'],
      required: [true, 'Action is required'],
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

subscriptionHistorySchema.index({ companyId: 1, createdAt: -1 });

const SubscriptionHistory =
  mongoose.models.SubscriptionHistory ||
  mongoose.model('SubscriptionHistory', subscriptionHistorySchema);

module.exports = SubscriptionHistory;
