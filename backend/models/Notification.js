const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    recipientEmail: { type: String, required: true },
    recipientUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    type: {
      type: String,
      enum: [
        'REGISTRATION_RECEIVED',
        'REGISTRATION_APPROVED',
        'REGISTRATION_REJECTED',
        'EVENT_UPDATED',
        'SCHEDULE_UPDATED',
        'EVENT_REMINDER',
        'SESSION_REMINDER',
      ],
      required: true,
    },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    status: { type: String, enum: ['SENT', 'FAILED', 'DEV_LOGGED'], default: 'DEV_LOGGED' },
    error: { type: String, default: '' },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientEmail: 1 });
NotificationSchema.index({ type: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
