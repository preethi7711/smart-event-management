const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const RegistrationSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    attendee: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendee', required: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'WAITLISTED', 'CANCELLED'],
      default: 'PENDING',
    },
    category: {
      type: String,
      enum: ['VIP', 'STANDARD', 'STUDENT', 'SPEAKER_GUEST', 'PRESS'],
      default: 'STANDARD',
    },
    checkInCode: { type: String, unique: true, default: () => uuidv4() },
    isDuplicate: { type: Boolean, default: false },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
    notes: { type: String, default: '' },
    aiInsight: {
      categoryConfidence: { type: Number, default: 0 },
      flags: [{ type: String }],
    },
  },
  { timestamps: true }
);

RegistrationSchema.index({ event: 1, attendee: 1 }, { unique: true });
RegistrationSchema.index({ status: 1 });

module.exports = mongoose.model('Registration', RegistrationSchema);
