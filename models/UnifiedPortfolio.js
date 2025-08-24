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

// Schema for individual crypto holdings
const cryptoHoldingSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 },
  avgPrice: { type: Number, required: true, default: 0 },
  totalCost: { type: Number, required: true, default: 0 },
  purchaseHistory: [{
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['buy', 'sell'], required: true }
  }]
}, { _id: false });

// Schema for individual forex positions
const forexPositionSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  size: { type: Number, required: true, default: 0 },
  avgPrice: { type: Number, required: true, default: 0 },
  type: { type: String, enum: ['buy', 'sell'], required: true },
  leverage: { type: Number, required: true, default: 100 },
  margin: { type: Number, required: true, default: 0 },
  purchaseHistory: [{
    size: { type: Number, required: true },
    price: { type: Number, required: true },
    leverage: { type: Number, required: true },
    margin: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['buy', 'sell'], required: true }
  }]
}, { _id: false });

// Main unified portfolio schema
const unifiedPortfolioSchema = new mongoose.Schema({
  discordId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  username: {
    type: String,
    required: true
  },
  // Shared cash balance across all trading types
  cash: { 
    type: Number, 
    default: 100000 // Starting with $100,000
  },
  totalValue: { 
    type: Number, 
    default: 100000 
  },
  // Asset holdings
  stocks: {
    type: Map,
    of: stockHoldingSchema,
    default: {}
  },
  cryptos: {
    type: Map,
    of: cryptoHoldingSchema,
    default: {}
  },
  forexPositions: {
    type: Map,
    of: forexPositionSchema,
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
  // Trading statistics by type
  stockTrades: { 
    type: Number, 
    default: 0 
  },
  cryptoTrades: { 
    type: Number, 
    default: 0 
  },
  forexTrades: { 
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
  // Asset allocation tracking
  assetAllocation: {
    stocks: { type: Number, default: 0 },
    cryptos: { type: Number, default: 0 },
    forex: { type: Number, default: 0 },
    cash: { type: Number, default: 100000 }
  },
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
unifiedPortfolioSchema.index({ discordId: 1 });
unifiedPortfolioSchema.index({ updatedAt: -1 });
unifiedPortfolioSchema.index({ totalGainLossPercent: -1 });

// Update the updatedAt field before saving
unifiedPortfolioSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance methods for stock trading
unifiedPortfolioSchema.methods.buyStock = function(symbol, shares, price) {
  // Validate inputs
  if (!shares || !price || isNaN(shares) || isNaN(price) || shares <= 0 || price <= 0) {
    throw new Error('Invalid shares or price');
  }
  
  const totalCost = shares * price;
  
  // Validate totalCost
  if (isNaN(totalCost) || totalCost <= 0) {
    throw new Error('Invalid total cost calculation');
  }
  
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
  this.stockTrades += 1;
  this.lastTradeAt = new Date();
  
  return this.save();
};

unifiedPortfolioSchema.methods.sellStock = function(symbol, shares, price) {
  // Validate inputs
  if (!shares || !price || isNaN(shares) || isNaN(price) || shares <= 0 || price <= 0) {
    throw new Error('Invalid shares or price');
  }
  
  const currentHolding = this.stocks.get(symbol);
  
  if (!currentHolding || currentHolding.shares < shares) {
    throw new Error('Insufficient shares');
  }
  
  const totalValue = shares * price;
  
  // Validate totalValue
  if (isNaN(totalValue) || totalValue <= 0) {
    throw new Error('Invalid total value calculation');
  }
  
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
  this.stockTrades += 1;
  this.lastTradeAt = new Date();
  
  // Check if this was a profitable trade
  const gainLoss = totalValue - (shares * currentHolding.avgPrice);
  if (gainLoss > 0) {
    this.successfulTrades += 1;
  }
  
  return this.save();
};

// Instance methods for crypto trading
unifiedPortfolioSchema.methods.buyCrypto = function(symbol, quantity, price) {
  // Validate inputs
  if (!quantity || !price || isNaN(quantity) || isNaN(price) || quantity <= 0 || price <= 0) {
    throw new Error('Invalid quantity or price');
  }
  
  const totalCost = quantity * price;
  
  // Validate totalCost
  if (isNaN(totalCost) || totalCost <= 0) {
    throw new Error('Invalid total cost calculation');
  }
  
  if (this.cash < totalCost) {
    throw new Error('Insufficient funds');
  }
  
  // Deduct cash
  this.cash -= totalCost;
  
  // Get or create crypto holding
  const currentHolding = this.cryptos.get(symbol) || {
    symbol: symbol,
    quantity: 0,
    avgPrice: 0,
    totalCost: 0,
    purchaseHistory: []
  };
  
  // Calculate new average price
  const newTotalQuantity = currentHolding.quantity + quantity;
  const newTotalCost = currentHolding.totalCost + totalCost;
  const newAvgPrice = newTotalCost / newTotalQuantity;
  
  // Update holding
  currentHolding.quantity = newTotalQuantity;
  currentHolding.avgPrice = newAvgPrice;
  currentHolding.totalCost = newTotalCost;
  currentHolding.purchaseHistory.push({
    quantity: quantity,
    price: price,
    totalCost: totalCost,
    timestamp: new Date(),
    type: 'buy'
  });
  
  // Update the cryptos map
  this.cryptos.set(symbol, currentHolding);
  
  // Update statistics
  this.cryptoTrades += 1;
  this.lastTradeAt = new Date();
  
  return this.save();
};

unifiedPortfolioSchema.methods.sellCrypto = function(symbol, quantity, price) {
  // Validate inputs
  if (!quantity || !price || isNaN(quantity) || isNaN(price) || quantity <= 0 || price <= 0) {
    throw new Error('Invalid quantity or price');
  }
  
  const currentHolding = this.cryptos.get(symbol);
  
  if (!currentHolding || currentHolding.quantity < quantity) {
    throw new Error('Insufficient quantity');
  }
  
  const totalValue = quantity * price;
  
  // Validate totalValue
  if (isNaN(totalValue) || totalValue <= 0) {
    throw new Error('Invalid total value calculation');
  }
  
  // Add cash
  this.cash += totalValue;
  
  // Update holding
  currentHolding.quantity -= quantity;
  currentHolding.totalCost -= (quantity * currentHolding.avgPrice);
  currentHolding.purchaseHistory.push({
    quantity: quantity,
    price: price,
    totalCost: totalValue,
    timestamp: new Date(),
    type: 'sell'
  });
  
  // If no quantity left, remove the holding
  if (currentHolding.quantity === 0) {
    this.cryptos.delete(symbol);
  } else {
    this.cryptos.set(symbol, currentHolding);
  }
  
  // Update statistics
  this.cryptoTrades += 1;
  this.lastTradeAt = new Date();
  
  // Check if this was a profitable trade
  const gainLoss = totalValue - (quantity * currentHolding.avgPrice);
  if (gainLoss > 0) {
    this.successfulTrades += 1;
  }
  
  return this.save();
};

// Instance methods for forex trading
unifiedPortfolioSchema.methods.openForexPosition = function(symbol, size, price, leverage, type) {
  const margin = size / leverage;
  
  if (this.cash < margin) {
    throw new Error('Insufficient margin');
  }
  
  // Deduct margin
  this.cash -= margin;
  
  // Get or create forex position
  const positionKey = `${symbol}_${type}`;
  const currentPosition = this.forexPositions.get(positionKey) || {
    symbol: symbol,
    size: 0,
    avgPrice: 0,
    type: type,
    leverage: leverage,
    margin: 0,
    purchaseHistory: []
  };
  
  // Calculate new average price
  const newTotalSize = currentPosition.size + size;
  const newTotalMargin = currentPosition.margin + margin;
  const newAvgPrice = ((currentPosition.size * currentPosition.avgPrice) + (size * price)) / newTotalSize;
  
  // Update position
  currentPosition.size = newTotalSize;
  currentPosition.avgPrice = newAvgPrice;
  currentPosition.margin = newTotalMargin;
  currentPosition.purchaseHistory.push({
    size: size,
    price: price,
    leverage: leverage,
    margin: margin,
    timestamp: new Date(),
    type: 'buy'
  });
  
  // Update the forex positions map
  this.forexPositions.set(positionKey, currentPosition);
  
  // Update statistics
  this.forexTrades += 1;
  this.lastTradeAt = new Date();
  
  return this.save();
};

unifiedPortfolioSchema.methods.closeForexPosition = function(symbol, size, price, type) {
  const positionKey = `${symbol}_${type}`;
  const currentPosition = this.forexPositions.get(positionKey);
  
  if (!currentPosition || currentPosition.size < size) {
    throw new Error('Insufficient position size');
  }
  
  const marginToReturn = (size / currentPosition.size) * currentPosition.margin;
  const pnl = type === 'buy' ? (price - currentPosition.avgPrice) * size : (currentPosition.avgPrice - price) * size;
  
  // Add cash (margin return + PnL)
  this.cash += marginToReturn + pnl;
  
  // Update position
  currentPosition.size -= size;
  currentPosition.margin -= marginToReturn;
  currentPosition.purchaseHistory.push({
    size: size,
    price: price,
    leverage: currentPosition.leverage,
    margin: marginToReturn,
    timestamp: new Date(),
    type: 'sell'
  });
  
  // If no size left, remove the position
  if (currentPosition.size === 0) {
    this.forexPositions.delete(positionKey);
  } else {
    this.forexPositions.set(positionKey, currentPosition);
  }
  
  // Update statistics
  this.forexTrades += 1;
  this.lastTradeAt = new Date();
  
  // Check if this was a profitable trade
  if (pnl > 0) {
    this.successfulTrades += 1;
  }
  
  return this.save();
};

// Update total portfolio value with current market prices
unifiedPortfolioSchema.methods.updateTotalValue = function(marketData) {
  let totalValue = this.cash;
  let stockValue = 0;
  let cryptoValue = 0;
  let forexValue = 0;
  
  // Calculate stock value
  for (const [symbol, holding] of this.stocks) {
    const currentPrice = marketData.stocks?.[symbol] || holding.avgPrice;
    stockValue += holding.shares * currentPrice;
  }
  
  // Calculate crypto value
  for (const [symbol, holding] of this.cryptos) {
    const currentPrice = marketData.cryptos?.[symbol] || holding.avgPrice;
    cryptoValue += holding.quantity * currentPrice;
  }
  
  // Calculate forex value (simplified - in real forex this would be more complex)
  for (const [positionKey, position] of this.forexPositions) {
    const currentPrice = marketData.forex?.[position.symbol] || position.avgPrice;
    const pnl = position.type === 'buy' ? 
      (currentPrice - position.avgPrice) * position.size :
      (position.avgPrice - currentPrice) * position.size;
    forexValue += position.margin + pnl;
  }
  
  totalValue = this.cash + stockValue + cryptoValue + forexValue;
  
  this.totalValue = totalValue;
  this.totalGainLoss = totalValue - 100000; // Starting amount
  this.totalGainLossPercent = ((totalValue - 100000) / 100000) * 100;
  
  // Update asset allocation
  this.assetAllocation = {
    stocks: stockValue,
    cryptos: cryptoValue,
    forex: forexValue,
    cash: this.cash
  };
  
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
unifiedPortfolioSchema.statics.getOrCreatePortfolio = async function(discordId, username) {
  let portfolio = await this.findOne({ discordId });
  
  if (!portfolio) {
    portfolio = new this({
      discordId: discordId,
      username: username,
      cash: 100000,
      totalValue: 100000,
      stocks: new Map(),
      cryptos: new Map(),
      forexPositions: new Map(),
      valueHistory: [{
        value: 100000,
        timestamp: new Date()
      }]
    });
    await portfolio.save();
  } else {
    // Clean up any NaN values in the portfolio
    portfolio = await this.cleanupPortfolio(portfolio);
  }
  
  return portfolio;
};

// Clean up corrupted portfolio data
unifiedPortfolioSchema.statics.cleanupPortfolio = async function(portfolio) {
  let needsUpdate = false;
  
  // Fix NaN cash
  if (isNaN(portfolio.cash) || portfolio.cash === null || portfolio.cash === undefined) {
    portfolio.cash = 100000;
    needsUpdate = true;
  }
  
  // Fix NaN totalValue
  if (isNaN(portfolio.totalValue) || portfolio.totalValue === null || portfolio.totalValue === undefined) {
    portfolio.totalValue = 100000;
    needsUpdate = true;
  }
  
  // Clean up crypto holdings
  if (portfolio.cryptos && portfolio.cryptos.size > 0) {
    for (const [symbol, holding] of portfolio.cryptos) {
      if (isNaN(holding.quantity) || holding.quantity <= 0) {
        portfolio.cryptos.delete(symbol);
        needsUpdate = true;
        continue;
      }
      
      if (isNaN(holding.avgPrice) || holding.avgPrice <= 0) {
        holding.avgPrice = 0;
        needsUpdate = true;
      }
      
      if (isNaN(holding.totalCost) || holding.totalCost <= 0) {
        holding.totalCost = holding.quantity * holding.avgPrice;
        needsUpdate = true;
      }
      
      // Clean up purchase history
      if (holding.purchaseHistory && holding.purchaseHistory.length > 0) {
        holding.purchaseHistory = holding.purchaseHistory.filter(entry => 
          !isNaN(entry.quantity) && entry.quantity > 0 &&
          !isNaN(entry.price) && entry.price > 0 &&
          !isNaN(entry.totalCost) && entry.totalCost > 0
        );
        needsUpdate = true;
      }
    }
  }
  
  // Clean up stock holdings
  if (portfolio.stocks && portfolio.stocks.size > 0) {
    for (const [symbol, holding] of portfolio.stocks) {
      if (isNaN(holding.shares) || holding.shares <= 0) {
        portfolio.stocks.delete(symbol);
        needsUpdate = true;
        continue;
      }
      
      if (isNaN(holding.avgPrice) || holding.avgPrice <= 0) {
        holding.avgPrice = 0;
        needsUpdate = true;
      }
      
      if (isNaN(holding.totalCost) || holding.totalCost <= 0) {
        holding.totalCost = holding.shares * holding.avgPrice;
        needsUpdate = true;
      }
      
      // Clean up purchase history
      if (holding.purchaseHistory && holding.purchaseHistory.length > 0) {
        holding.purchaseHistory = holding.purchaseHistory.filter(entry => 
          !isNaN(entry.shares) && entry.shares > 0 &&
          !isNaN(entry.price) && entry.price > 0 &&
          !isNaN(entry.totalCost) && entry.totalCost > 0
        );
        needsUpdate = true;
      }
    }
  }
  
  if (needsUpdate) {
    await portfolio.save();
  }
  
  return portfolio;
};

unifiedPortfolioSchema.statics.getUserPortfolio = function(discordId) {
  return this.findOne({ discordId });
};

unifiedPortfolioSchema.statics.getTopPerformers = function(limit = 10) {
  return this.find({})
    .sort({ totalGainLossPercent: -1 })
    .limit(limit)
    .select('discordId username totalValue totalGainLoss totalGainLossPercent updatedAt');
};

module.exports = mongoose.model('UnifiedPortfolio', unifiedPortfolioSchema);
