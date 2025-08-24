import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

import mongoose from 'mongoose';

// Connect to MongoDB if not already connected
async function connectDB() {
  if (mongoose.connections[0].readyState) {
    return;
  }
  
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Portfolio Schema (should match models/Portfolio.js)
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

const portfolioSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  cash: { type: Number, default: 100000 },
  totalValue: { type: Number, default: 100000 },
  stocks: { type: Map, of: stockHoldingSchema, default: {} },
  totalGainLoss: { type: Number, default: 0 },
  totalGainLossPercent: { type: Number, default: 0 },
  totalTrades: { type: Number, default: 0 },
  successfulTrades: { type: Number, default: 0 },
  valueHistory: [{
    value: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastTradeAt: { type: Date }
});

portfolioSchema.pre('save', function(this: any, next: any) {
  this.updatedAt = new Date();
  next();
});

const Portfolio = mongoose.models.Portfolio || mongoose.model('Portfolio', portfolioSchema);

// POST - Execute a trade (buy or sell)
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id;
    const body = await request.json();
    
    const { action, symbol, shares, price, stockName } = body;
    
    if (!action || !symbol || !shares || !price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Get or create portfolio
    let portfolio = await Portfolio.findOne({ userId });
    
    if (!portfolio) {
      portfolio = new Portfolio({
        userId: userId,
        cash: 100000,
        totalValue: 100000,
        stocks: new Map(),
        valueHistory: [{
          value: 100000,
          timestamp: new Date()
        }]
      });
    }
    
    const totalCost = shares * price;
    
    if (action === 'buy') {
      // Check if user has enough cash
      if (portfolio.cash < totalCost) {
        return NextResponse.json(
          { error: 'Insufficient funds' },
          { status: 400 }
        );
      }
      
      // Deduct cash
      portfolio.cash -= totalCost;
      
      // Get or create stock holding
      const currentHolding = portfolio.stocks.get(symbol) || {
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
      portfolio.stocks.set(symbol, currentHolding);
      
    } else if (action === 'sell') {
      const currentHolding = portfolio.stocks.get(symbol);
      
      if (!currentHolding || currentHolding.shares < shares) {
        return NextResponse.json(
          { error: 'Insufficient shares' },
          { status: 400 }
        );
      }
      
      const totalValue = shares * price;
      
      // Add cash
      portfolio.cash += totalValue;
      
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
      
      // Check if this was a profitable trade
      const gainLoss = totalValue - (shares * currentHolding.avgPrice);
      if (gainLoss > 0) {
        portfolio.successfulTrades += 1;
      }
      
      // If no shares left, remove the holding
      if (currentHolding.shares === 0) {
        portfolio.stocks.delete(symbol);
      } else {
        portfolio.stocks.set(symbol, currentHolding);
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "buy" or "sell"' },
        { status: 400 }
      );
    }
    
    // Update statistics
    portfolio.totalTrades += 1;
    portfolio.lastTradeAt = new Date();
    
    // Calculate new total value (simplified - in real app you'd get current prices)
    let totalValue = portfolio.cash;
    for (const [stockSymbol, holding] of portfolio.stocks) {
      totalValue += holding.shares * (stockSymbol === symbol ? price : holding.avgPrice);
    }
    
    portfolio.totalValue = totalValue;
    portfolio.totalGainLoss = totalValue - 100000;
    portfolio.totalGainLossPercent = ((totalValue - 100000) / 100000) * 100;
    
    // Add to value history
    portfolio.valueHistory.push({
      value: totalValue,
      timestamp: new Date()
    });
    
    // Keep only last 100 entries
    if (portfolio.valueHistory.length > 100) {
      portfolio.valueHistory = portfolio.valueHistory.slice(-100);
    }
    
    await portfolio.save();
    
    // Convert Map to Object for JSON response
    const portfolioData = portfolio.toObject();
    portfolioData.stocks = Object.fromEntries(portfolio.stocks);
    
    return NextResponse.json({
      success: true,
      message: `Successfully ${action === 'buy' ? 'bought' : 'sold'} ${shares} shares of ${symbol}`,
      portfolio: portfolioData,
      trade: {
        action,
        symbol,
        stockName,
        shares,
        price,
        totalCost: action === 'buy' ? totalCost : totalValue,
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    console.error('Error executing trade:', error);
    return NextResponse.json(
      { error: 'Failed to execute trade' },
      { status: 500 }
    );
  }
}
