import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const mongoose = await import('mongoose');
    const userId = (session.user as any).id;

    // Try to use enhanced user model first, fallback to legacy system
    let EnhancedUser;
    let Currency;
    
    try {
      // Try to get enhanced user model
      EnhancedUser = mongoose.model('EnhancedUser');
      console.log('Using Enhanced User model for currency balance');
    } catch (error) {
      // Fallback to legacy currency model
      // const { default: Currency } = await import('../../../../models/Currency.js');
      console.log('Using legacy Currency model for balance');
    }

    let balance = { hamstercoin: 0 };

    if (EnhancedUser) {
      // Use enhanced user model with embedded currency
      const user = await EnhancedUser.findOne({ discordId: userId });
      
      if (user && user.currency) {
        balance = {
          hamstercoin: user.currency.hamsterCoins || 0
        };
      } else {
        // Create new enhanced user with default currency
        const newUser = new EnhancedUser({
          discordId: userId,
          username: session.user.name || 'Unknown',
          email: session.user.email || `${userId}@discord.local`,
          avatar: (session.user as any).image,
          currency: {
            hamsterCoins: 100, // Give 100 hamstercoins to new users
            totalEarned: 100,
            totalSpent: 0
          }
        });
        
        await newUser.save();
        balance = { hamstercoin: 100 };
      }
    } else {
      // Legacy system - define and use separate currency model
      const CurrencySchema = new mongoose.Schema({
        userId: { type: String, required: true, unique: true },
        hamsterCoins: { type: Number, default: 0 },
        totalEarned: { type: Number, default: 0 },
        totalSpent: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
      });

      const Currency = mongoose.models.Currency || mongoose.model('Currency', CurrencySchema);
      
      // Get or create currency for user
      let currency = await Currency.findOne({ userId });
      
      if (!currency) {
        // Create new currency record with 100 starting coins
        currency = new Currency({
          userId,
          hamsterCoins: 100,
          totalEarned: 100,
          totalSpent: 0
        });
        await currency.save();
      }
      
      balance = {
        hamstercoin: currency.hamsterCoins || 0
      };
    }

    return NextResponse.json({
      success: true,
      balance: balance,
      source: EnhancedUser ? 'enhanced' : 'legacy'
    });
  } catch (error) {
    console.error('Error fetching currency balance:', error);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}