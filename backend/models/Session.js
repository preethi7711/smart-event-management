const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    topic: { type: String, default: 'General' },
    speaker: { type: mongoose.Schema.Types.ObjectId, ref: 'Speaker' },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    capacity: { type: Number, required: true },
    sessionType: { type: String, enum: ['KEYNOTE', 'WORKSHOP', 'TALK', 'PANEL', 'BREAK'], default: 'TALK' },
    status: { type: String, enum: ['DRAFT', 'SCHEDULED', 'CONFLICT', 'CANCELLED', 'COMPLETED'], default: 'DRAFT' },
    conflictReason: { type: String, default: '' },
  },
  { timestamps: true }
);

SessionSchema.index({ event: 1 });
SessionSchema.index({ speaker: 1, startTime: 1 });
SessionSchema.index({ room: 1, startTime: 1 });

module.exports = mongoose.model('Session', SessionSchema);
