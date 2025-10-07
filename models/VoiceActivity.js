const mongoose = require('mongoose');

const voiceActivitySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: String,
  globalName: String,
  avatar: String,
  voiceJoinCount: { type: Number, default: 0 },
  totalVoiceTime: { type: Number, default: 0 }, // in minutes
  lastVoiceJoin: Date,
  lastVoiceLeave: Date,
  userType: { type: String, enum: ['real_user', 'suspicious_user'], default: 'suspicious_user' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for faster queries
voiceActivitySchema.index({ userId: 1 });
voiceActivitySchema.index({ userType: 1 });
voiceActivitySchema.index({ isActive: 1 });

module.exports = mongoose.models.VoiceActivity || mongoose.model('VoiceActivity', voiceActivitySchema);
