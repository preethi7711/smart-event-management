const mongoose = require('mongoose');

// A lightweight attendee profile, distinct from User, so organizers can
// import/manage attendees who may or may not have platform accounts.
const AttendeeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: '' },
    organization: { type: String, default: '' },
    jobTitle: { type: String, default: '' },
    ageGroup: { type: String, enum: ['18-24', '25-34', '35-44', '45-54', '55+', 'UNSPECIFIED'], default: 'UNSPECIFIED' },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED'], default: 'UNSPECIFIED' },
    source: { type: String, enum: ['WEB', 'ORGANIZER_CREATED', 'IMPORTED'], default: 'WEB' },
  },
  { timestamps: true }
);

AttendeeSchema.index({ email: 1 });

module.exports = mongoose.model('Attendee', AttendeeSchema);
