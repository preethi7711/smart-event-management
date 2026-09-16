const mongoose = require('mongoose');

const AIRecommendationSchema = new mongoose.Schema(
  {
    agent: {
      type: String,
      enum: ['REGISTRATION', 'VENUE', 'SPEAKER', 'SCHEDULING', 'ANALYTICS'],
      required: true,
    },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    targetType: { type: String, default: '' }, // e.g. 'Venue', 'Speaker', 'Session'
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    source: { type: String, enum: ['LLM', 'RULE_ENGINE'], required: true },
    recommendation: { type: String, required: true },
    score: { type: Number, default: null },
    reasons: [{ type: String }],
    alternatives: [{ type: mongoose.Schema.Types.Mixed }],
    rawContext: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

AIRecommendationSchema.index({ agent: 1, event: 1 });

module.exports = mongoose.model('AIRecommendation', AIRecommendationSchema);
