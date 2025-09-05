const mongoose = require('mongoose');

const housePointsSchema = new mongoose.Schema({
  houseName: {
    type: String,
    required: true,
    unique: true,
    enum: ['Selene', 'Pleiades', 'Ophira']
  },
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String, // Admin user ID who updated the points
    required: true
  },
  updateReason: {
    type: String,
    default: 'Manual update'
  }
});

// Create index for efficient queries
housePointsSchema.index({ houseName: 1 });
housePointsSchema.index({ points: -1 }); // For leaderboard sorting

// Update the lastUpdated field before saving
housePointsSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.models.HousePoints || mongoose.model('HousePoints', housePointsSchema);
