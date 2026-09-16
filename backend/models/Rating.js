const mongoose = require('mongoose');

const RatingSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    speaker: { type: mongoose.Schema.Types.ObjectId, ref: 'Speaker', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    attendee: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendee', required: true },
    score: { type: Number, required: true, min: 1, max: 5 },
  },
  { timestamps: true }
);

RatingSchema.index({ session: 1, attendee: 1 }, { unique: true });
RatingSchema.index({ speaker: 1 });

module.exports = mongoose.model('Rating', RatingSchema);
