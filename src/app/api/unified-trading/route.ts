import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authConfig } from "@/lib/auth-config";
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

// Import the UnifiedPortfolio model
import UnifiedPortfolio from '../../../../models/UnifiedPortfolio';

export async function GET(request: NextRequest) {
  try {
    console.log('Unified trading API called');
    
    const session = await getServerSession(authConfig);

    console.log('Session debug:', { 
      session: !!session, 
      userId: session?.user?.id, 
      username: session?.user?.username 
    });

    if (!session?.user?.id) {
      console.log('No session or user ID found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const portfolio = await (UnifiedPortfolio as any).getUserPortfolio(session.user.id);
    
    if (!portfolio) {
      // Create new portfolio if it doesn't exist
      const newPortfolio = await (UnifiedPortfolio as any).getOrCreatePortfolio(session.user.id, session.user.name || "Unknown");
      return NextResponse.json(newPortfolio);
    }
    
    return NextResponse.json(portfolio);
  } catch (error) {
    console.error("Error in unified trading API:", error);
    return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, assetType, symbol, amount, price, quantity } = body;
    
    console.log('Trade request received:', { action, assetType, symbol, amount, price, quantity });

    await connectDB();
    const portfolio = await (UnifiedPortfolio as any).getOrCreatePortfolio(session.user.id, session.user.name || "Unknown");

    try {
      switch (assetType) {
        case 'stock':
          if (action === 'buy') {
            await portfolio.buyStock(symbol, amount, price);
          } else if (action === 'sell') {
            await portfolio.sellStock(symbol, quantity, price);
          }
          break;
        
        case 'crypto':
          if (action === 'buy') {
            // For crypto buy, amount is in USD, we need to calculate the quantity
            const quantity = amount / price;
            await portfolio.buyCrypto(symbol, quantity, price);
          } else if (action === 'sell') {
            await portfolio.sellCrypto(symbol, quantity, price);
          }
          break;
        
        case 'forex':
          if (action === 'buy' || action === 'open') {
            // For forex buy, we need leverage. Default to 100:1 if not provided
            const leverage = body.leverage || 100;
            const positionType = body.type || 'buy';
            await portfolio.openForexPosition(symbol, amount, price, leverage, positionType);
          } else if (action === 'sell' || action === 'close') {
            const positionType = body.type || 'buy';
            await portfolio.closeForexPosition(symbol, amount, price, positionType);
          }
          break;
        
        default:
          return NextResponse.json({ error: "Invalid asset type" }, { status: 400 });
      }
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 400 });
    }

    return NextResponse.json({ success: true, portfolio });
  } catch (error) {
    console.error("Error executing trade:", error);
    return NextResponse.json({ error: "Failed to execute trade" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { marketData } = body;

    await connectDB();
    const portfolio = await (UnifiedPortfolio as any).getUserPortfolio(session.user.id);
    
    if (!portfolio) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }

    await portfolio.updateTotalValue(marketData);
    
    return NextResponse.json({ success: true, portfolio });
  } catch (error) {
    console.error("Error updating portfolio:", error);
    return NextResponse.json({ error: "Failed to update portfolio" }, { status: 500 });
  }
}
