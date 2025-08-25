const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true,
    default: '🏆' // Default emoji icon
  },
  rarity: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 50 // Percentage of players who have this achievement
  },
  category: {
    type: String,
    enum: ['Task', 'Goal', 'Quest'],
    default: 'Goal'
  },
  coinReward: {
    type: Number,
    required: true,
    min: 0,
    default: 100 // Default coin reward when achievement is completed
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.models.Achievement || mongoose.model('Achievement', achievementSchema);
