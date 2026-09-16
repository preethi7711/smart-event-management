const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
    attendee: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendee', required: true },
    comment: { type: String, required: true, trim: true },
    sentiment: { type: String, enum: ['POSITIVE', 'NEUTRAL', 'NEGATIVE'], default: 'NEUTRAL' },
    sentimentScore: { type: Number, default: 0 }, // -1..1
    topics: [{ type: String }],
  },
  { timestamps: true }
);

FeedbackSchema.index({ event: 1 });
FeedbackSchema.index({ session: 1 });

module.exports = mongoose.model('Feedback', FeedbackSchema);
