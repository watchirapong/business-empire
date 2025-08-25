const mongoose = require('mongoose');

const AchievementSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['login', 'trading', 'gacha', 'shop', 'voice', 'social', 'special']
  },
  rarity: { 
    type: String, 
    required: true,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary']
  },
  icon: { type: String, required: true },
  requirement: {
    type: { type: String, required: true },
    value: { type: Number, required: true },
    description: { type: String, required: true }
  },
  reward: {
    hamsterCoins: { type: Number, default: 0 },
    experience: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Achievement || mongoose.model('Achievement', AchievementSchema);
