const mongoose = require('mongoose');

const VenueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    totalCapacity: { type: Number, required: true },
    pricePerDay: { type: Number, required: true },
    facilities: [{ type: String }], // e.g. WIFI, PROJECTOR, CATERING, PARKING, AV_SYSTEM, STAGE
    accessibilityFeatures: [{ type: String }],
    rating: { type: Number, default: 4, min: 0, max: 5 },
    contactEmail: { type: String },
    contactPhone: { type: String },
    isActive: { type: Boolean, default: true },
    images: [{ type: String }],
  },
  { timestamps: true }
);

VenueSchema.index({ city: 1 });
VenueSchema.index({ totalCapacity: 1 });

module.exports = mongoose.model('Venue', VenueSchema);
