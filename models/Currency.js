const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  hamsterCoins: { type: Number, default: 0 }, // Starting amount
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for faster queries
currencySchema.index({ userId: 1 });

// Instance methods
currencySchema.methods.addCoins = function(amount, description = 'Earned coins') {
  this.hamsterCoins += amount;
  this.totalEarned += amount;
  this.updatedAt = new Date();
  return this.save();
};

currencySchema.methods.spendCoins = function(amount, description = 'Spent coins') {
  if (this.hamsterCoins < amount) {
    throw new Error('Insufficient coins');
  }
  this.hamsterCoins -= amount;
  this.totalSpent += amount;
  this.updatedAt = new Date();
  return this.save();
};

// Static methods
currencySchema.statics.getUserCurrency = function(userId) {
  return this.findOne({ userId });
};

currencySchema.statics.getOrCreateUserCurrency = async function(userId) {
  let currency = await this.findOne({ userId });
  
  if (!currency) {
    currency = new this({
      userId,
      hamsterCoins: 0,
      totalEarned: 0
    });
    await currency.save();
  }
  
  return currency;
};

module.exports = mongoose.model('Currency', currencySchema);
