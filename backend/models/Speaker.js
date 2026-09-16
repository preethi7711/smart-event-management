const mongoose = require('mongoose');

const SpeakerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    bio: { type: String, default: '' },
    expertise: [{ type: String }], // topics e.g. ["AI", "Cloud", "Security"]
    yearsExperience: { type: Number, default: 1 },
    averageRating: { type: Number, default: 4, min: 0, max: 5 },
    totalSessions: { type: Number, default: 0 },
    fee: { type: Number, default: 0 },
    profileImage: { type: String, default: '' },
    linkedIn: { type: String, default: '' },
    isActive: { type: Boolean, default: true },

    // Availability windows (dates the speaker is UNAVAILABLE)
    unavailableDates: [{ type: Date }],
  },
  { timestamps: true }
);

SpeakerSchema.index({ expertise: 1 });
SpeakerSchema.index({ averageRating: -1 });

module.exports = mongoose.model('Speaker', SpeakerSchema);
