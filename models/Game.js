const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  id: String,
  name: { type: String, required: true },
  remainingMoney: { type: Number, default: 100000 },
  investments: { type: Map, of: Number, default: {} }
}, { _id: false });

const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  currentPrice: { type: Number, required: true },
  priceHistory: [{ type: Number }],
  volatility: { type: Number, default: 0.1 }
}, { _id: false });

const gameSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  players: [playerSchema],
  companies: [companySchema],
  phase: { 
    type: String, 
    enum: ['waiting', 'playing', 'finished'], 
    default: 'waiting' 
  },
  currentPlayerIndex: { type: Number, default: 0 },
  currentCompanyIndex: { type: Number, default: 0 },
  investments: { type: Map, of: Number, default: {} },
  readyPlayers: [String],
  submittedPlayers: [String],
  hostId: String,
  hostName: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
gameSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Game', gameSchema);
