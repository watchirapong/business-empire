const mongoose = require('mongoose');

const serverMemberDataSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  discordId: { type: String, required: true },
  username: String,
  globalName: String,
  nickname: String,
  avatar: String,
  discriminator: String,
  roles: [String],
  joinedAt: Date,
  premiumSince: Date,
  isBot: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now }
});

// Index for faster queries
serverMemberDataSchema.index({ userId: 1 });
serverMemberDataSchema.index({ discordId: 1 });
serverMemberDataSchema.index({ lastUpdated: 1 });

module.exports = mongoose.models.ServerMemberData || mongoose.model('ServerMemberData', serverMemberDataSchema);
