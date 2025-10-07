const mongoose = require('mongoose');

const usernameHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  oldUsername: String,
  newUsername: String,
  changedAt: { type: Date, default: Date.now },
  changeType: { type: String, enum: ['manual', 'automatic'], default: 'manual' }
});

// Index for faster queries
usernameHistorySchema.index({ userId: 1 });
usernameHistorySchema.index({ changedAt: 1 });

module.exports = mongoose.models.UsernameHistory || mongoose.model('UsernameHistory', usernameHistorySchema);
