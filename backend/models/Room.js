const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema(
  {
    venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
    name: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true },
    facilities: [{ type: String }],
    floor: { type: String, default: '1' },
    isActive: { type: Boolean, default: true },

    // Real-time locking (soft-lock while an organizer is mid-booking)
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    lockedForEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    lockExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

RoomSchema.index({ venue: 1 });

// A room is "locked" only while lockExpiresAt is in the future
RoomSchema.methods.isCurrentlyLocked = function isCurrentlyLocked(byOtherThan = null) {
  if (!this.lockExpiresAt || this.lockExpiresAt < new Date()) return false;
  if (byOtherThan && this.lockedBy && this.lockedBy.toString() === byOtherThan.toString()) return false;
  return true;
};

module.exports = mongoose.model('Room', RoomSchema);
