const mongoose = require('mongoose');

const voiceSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: String,
  globalName: String,
  channelId: String,
  channelName: String,
  joinTime: { type: Date, required: true },
  leaveTime: Date,
  duration: Number, // in minutes
  createdAt: { type: Date, default: Date.now }
});

// Index for faster queries
voiceSessionSchema.index({ userId: 1 });
voiceSessionSchema.index({ joinTime: 1 });
voiceSessionSchema.index({ channelId: 1 });

module.exports = mongoose.models.VoiceSession || mongoose.model('VoiceSession', voiceSessionSchema);
