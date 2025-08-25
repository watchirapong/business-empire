const mongoose = require('mongoose');

const UserAchievementSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  achievementId: { type: String, required: true },
  progress: { type: Number, default: 0 },
  isUnlocked: { type: Boolean, default: false },
  unlockedAt: { type: Date },
  claimed: { type: Boolean, default: false },
  claimedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Compound index to ensure unique user-achievement combinations
UserAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

module.exports = mongoose.models.UserAchievement || mongoose.model('UserAchievement', UserAchievementSchema);
