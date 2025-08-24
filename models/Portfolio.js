const mongoose = require('mongoose');

// Schema for individual stock holdings
const stockHoldingSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  shares: { type: Number, required: true, default: 0 },
  avgPrice: { type: Number, required: true, default: 0 },
  totalCost: { type: Number, required: true, default: 0 },
  purchaseHistory: [{
    shares: { type: Number, required: true },
    price: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['buy', 'sell'], required: true }
  }]
}, { _id: false });

// Main portfolio schema
const portfolioSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  cash: { 
    type: Number, 
    default: 100000 // Starting with $100,000
  },
  totalValue: { 
    type: Number, 
    default: 100000 
  },
  stocks: {
    type: Map,
    of: stockHoldingSchema,
    default: {}
  },
  // Performance tracking
  totalGainLoss: { 
    type: Number, 
    default: 0 
  },
  totalGainLossPercent: { 
    type: Number, 
    default: 0 
  },
  // Trading statistics
  totalTrades: { 
    type: Number, 
    default: 0 
  },
  successfulTrades: { 
    type: Number, 
    default: 0 
  },
  // Portfolio history for charts
  valueHistory: [{
    value: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  // Metadata
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  lastTradeAt: { 
    type: Date 
  }
});

// Indexes for better performance
portfolioSchema.index({ userId: 1 });
portfolioSchema.index({ updatedAt: -1 });

// Update the updatedAt field before saving
portfolioSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance methods
portfolioSchema.methods.buyStock = function(symbol, shares, price) {
  const totalCost = shares * price;
  
  if (this.cash < totalCost) {
    throw new Error('Insufficient funds');
  }
  
  // Deduct cash
  this.cash -= totalCost;
  
  // Get or create stock holding
  const currentHolding = this.stocks.get(symbol) || {
    symbol: symbol,
    shares: 0,
    avgPrice: 0,
    totalCost: 0,
    purchaseHistory: []
  };
  
  // Calculate new average price
  const newTotalShares = currentHolding.shares + shares;
  const newTotalCost = currentHolding.totalCost + totalCost;
  const newAvgPrice = newTotalCost / newTotalShares;
  
  // Update holding
  currentHolding.shares = newTotalShares;
  currentHolding.avgPrice = newAvgPrice;
  currentHolding.totalCost = newTotalCost;
  currentHolding.purchaseHistory.push({
    shares: shares,
    price: price,
    totalCost: totalCost,
    timestamp: new Date(),
    type: 'buy'
  });
  
  // Update the stocks map
  this.stocks.set(symbol, currentHolding);
  
  // Update statistics
  this.totalTrades += 1;
  this.lastTradeAt = new Date();
  
  return this.save();
};

portfolioSchema.methods.sellStock = function(symbol, shares, price) {
  const currentHolding = this.stocks.get(symbol);
  
  if (!currentHolding || currentHolding.shares < shares) {
    throw new Error('Insufficient shares');
  }
  
  const totalValue = shares * price;
  
  // Add cash
  this.cash += totalValue;
  
  // Update holding
  currentHolding.shares -= shares;
  currentHolding.totalCost -= (shares * currentHolding.avgPrice);
  currentHolding.purchaseHistory.push({
    shares: shares,
    price: price,
    totalCost: totalValue,
    timestamp: new Date(),
    type: 'sell'
  });
  
  // If no shares left, remove the holding
  if (currentHolding.shares === 0) {
    this.stocks.delete(symbol);
  } else {
    this.stocks.set(symbol, currentHolding);
  }
  
  // Update statistics
  this.totalTrades += 1;
  this.lastTradeAt = new Date();
  
  // Check if this was a profitable trade
  const gainLoss = totalValue - (shares * currentHolding.avgPrice);
  if (gainLoss > 0) {
    this.successfulTrades += 1;
  }
  
  return this.save();
};

portfolioSchema.methods.updateTotalValue = function(stockPrices) {
  let totalValue = this.cash;
  
  // Add value of all stock holdings
  for (const [symbol, holding] of this.stocks) {
    const currentPrice = stockPrices[symbol] || holding.avgPrice;
    totalValue += holding.shares * currentPrice;
  }
  
  this.totalValue = totalValue;
  this.totalGainLoss = totalValue - 100000; // Starting amount
  this.totalGainLossPercent = ((totalValue - 100000) / 100000) * 100;
  
  // Add to value history (limit to last 100 entries)
  this.valueHistory.push({
    value: totalValue,
    timestamp: new Date()
  });
  
  // Keep only last 100 entries
  if (this.valueHistory.length > 100) {
    this.valueHistory = this.valueHistory.slice(-100);
  }
  
  return this.save();
};

// Static methods
portfolioSchema.statics.getOrCreatePortfolio = async function(userId) {
  let portfolio = await this.findOne({ userId });
  
  if (!portfolio) {
    portfolio = new this({
      userId: userId,
      cash: 100000,
      totalValue: 100000,
      stocks: new Map(),
      valueHistory: [{
        value: 100000,
        timestamp: new Date()
      }]
    });
    await portfolio.save();
  }
  
  return portfolio;
};

portfolioSchema.statics.getUserPortfolio = function(userId) {
  return this.findOne({ userId });
};

portfolioSchema.statics.getTopPerformers = function(limit = 10) {
  return this.find({})
    .sort({ totalGainLossPercent: -1 })
    .limit(limit)
    .select('userId totalValue totalGainLoss totalGainLossPercent updatedAt');
};

module.exports = mongoose.model('Portfolio', portfolioSchema);
