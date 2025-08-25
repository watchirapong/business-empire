const mongoose = require('mongoose');

const userAchievementSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  achievementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement',
    required: true
  },
  unlockedAt: {
    type: Date,
    default: Date.now
  },
  progress: {
    type: Number,
    default: 100
  },
  coinsRewarded: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.models.UserAchievement || mongoose.model('UserAchievement', userAchievementSchema);
