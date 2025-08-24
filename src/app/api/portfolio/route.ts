import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Import the Portfolio model
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

// Portfolio Schema (inline for now, should match models/Portfolio.js)
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

// GET - Retrieve user's portfolio
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id;
    
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
      await portfolio.save();
    }
    
    // Convert Map to Object for JSON serialization
    const portfolioData = portfolio.toObject();
    portfolioData.stocks = Object.fromEntries(portfolio.stocks);
    
    return NextResponse.json({
      success: true,
      portfolio: portfolioData
    });
    
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}

// POST - Update user's portfolio
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id;
    const body = await request.json();
    
    const { cash, stocks, totalValue } = body;
    
    // Find or create portfolio
    let portfolio = await Portfolio.findOne({ userId });
    
    if (!portfolio) {
      portfolio = new Portfolio({ userId });
    }
    
    // Update portfolio data
    portfolio.cash = cash;
    portfolio.totalValue = totalValue;
    portfolio.totalGainLoss = totalValue - 100000;
    portfolio.totalGainLossPercent = ((totalValue - 100000) / 100000) * 100;
    
    // Convert stocks object to Map
    const stocksMap = new Map();
    for (const [symbol, holding] of Object.entries(stocks)) {
      stocksMap.set(symbol, holding);
    }
    portfolio.stocks = stocksMap;
    
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
    
    return NextResponse.json({
      success: true,
      message: 'Portfolio updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to update portfolio' },
      { status: 500 }
    );
  }
}
