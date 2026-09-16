const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, default: 'General' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    expectedAttendance: { type: Number, default: 0 },
    budget: { type: Number, default: 0 },
    requiredCapacity: { type: Number, default: 0 },
    requiredFacilities: [{ type: String }],
    status: {
      type: String,
      enum: ['DRAFT', 'PLANNING', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED'],
      default: 'DRAFT',
    },
    coverImage: { type: String, default: '' },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    registrationDeadline: { type: Date },
    requiresApproval: { type: Boolean, default: true },
    tags: [{ type: String }],
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

EventSchema.pre('validate', function ensureEventDefaults(next) {
  if (this.status) this.status = this.status.toUpperCase();
  if (!this.description) this.description = 'No description provided.';
  next();
});

EventSchema.index({ status: 1 });
EventSchema.index({ startDate: 1 });
EventSchema.index({ organizer: 1 });

module.exports = mongoose.model('Event', EventSchema);
