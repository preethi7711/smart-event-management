const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    severity: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    entityType: { type: String, default: '' }, // e.g., 'Venue', 'Speaker', 'System'
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    evidence: { type: String, default: '' }, // metric or reason
    recommendedAction: { type: String, default: '' },
    status: { type: String, enum: ['New', 'Acknowledged', 'Resolved'], default: 'New' },
    sourceAgent: { type: String, default: 'System' }
  },
  { timestamps: true }
);

AlertSchema.index({ status: 1 });
AlertSchema.index({ severity: 1 });
AlertSchema.index({ event: 1 });

module.exports = mongoose.model('Alert', AlertSchema);
