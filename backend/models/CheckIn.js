const mongoose = require('mongoose');

const CheckInSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true },
    attendee: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendee', required: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null }, // null = event-level check-in
    checkedInAt: { type: Date, default: Date.now },
    method: { type: String, enum: ['QR', 'CODE', 'MANUAL'], default: 'QR' },
    checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Prevent duplicate check-in for the same registration + session context
CheckInSchema.index({ registration: 1, session: 1 }, { unique: true });
CheckInSchema.index({ event: 1, session: 1 });
CheckInSchema.index({ session: 1 });

module.exports = mongoose.model('CheckIn', CheckInSchema);
