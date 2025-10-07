import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';

// Gacha pull costs
const GACHA_COIN_COST = 10; // 10 Hamster Coins per pull
const GACHA_TICKET_COST = 1; // 1 Ticket per pull

// POST - Perform a gacha pull
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { paymentMethod = 'coins' } = body; // 'coins' or 'tickets'
    
    await connectDB();
    
    const mongoose = await import('mongoose');

    // Gacha Item Schema
    const gachaItemSchema = new mongoose.Schema({
      name: { type: String, required: true, trim: true },
      description: { type: String, required: true, trim: true },
      image: { type: String, required: true, trim: true },
      rarity: { type: String, required: true, enum: ['common', 'rare', 'epic', 'legendary', 'mythic'] },
      dropRate: { type: Number, required: true, min: 0, max: 100 },
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    // Gacha pull history schema
    const gachaPullSchema = new mongoose.Schema({
      userId: { type: String, required: true },
      itemId: { type: String, required: true },
      itemName: { type: String, required: true },
      itemRarity: { type: String, required: true },
      pullDate: { type: Date, default: Date.now },
      cost: { type: Number, default: 10 } // Cost in Hamster Coins
    });

    const GachaItem = mongoose.models.GachaItem || mongoose.model('GachaItem', gachaItemSchema);
    const GachaPull = mongoose.models.GachaPull || mongoose.model('GachaPull', gachaPullSchema);

    let cost = 0;
    let paymentType = '';
    let hasEnoughCurrency = false;

    // Try to use enhanced user model first, fallback to legacy system
    let EnhancedUser;
    let Currency;
    
    try {
      // Try to get enhanced user model
      EnhancedUser = mongoose.model('EnhancedUser');
      console.log('Using Enhanced User model for gacha pull');
    } catch (error) {
      // Fallback to legacy currency model
      Currency = mongoose.models.Currency || mongoose.model('Currency', new mongoose.Schema({
        userId: { type: String, required: true, unique: true },
        hamsterCoins: { type: Number, default: 0 },
        totalEarned: { type: Number, default: 0 },
        totalSpent: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
      }));
      console.log('Using legacy Currency model for gacha pull');
    }

    if (paymentMethod === 'tickets') {
      // Check ticket balance
      const ticketResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/tickets`, {
        headers: {
          'Cookie': request.headers.get('cookie') || ''
        }
      });
      
      if (ticketResponse.ok) {
        const ticketData = await ticketResponse.json();
        if (ticketData.success && ticketData.data.balance >= GACHA_TICKET_COST) {
          hasEnoughCurrency = true;
          cost = GACHA_TICKET_COST;
          paymentType = 'tickets';
        }
      }
    } else {
      // Check Hamster Coins balance
      if (EnhancedUser) {
        // Use enhanced user model
        const user = await EnhancedUser.findOne({ discordId: userId });
        
        if (!user) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.currency.hamsterCoins >= GACHA_COIN_COST) {
          hasEnoughCurrency = true;
          cost = GACHA_COIN_COST;
          paymentType = 'coins';
        }
      } else {
        // Legacy system
        // let userCurrency = await Currency.findOne({ userId });
        
        // if (!userCurrency) {
        //   userCurrency = new Currency({
        //     userId,
        //     hamsterCoins: 0,
        //     totalEarned: 0,
        //     totalSpent: 0
        //   });
        // }

        // if (userCurrency.hamsterCoins >= GACHA_COIN_COST) {
        //   hasEnoughCurrency = true;
        //   cost = GACHA_COIN_COST;
        //   paymentType = 'coins';
        // }
        hasEnoughCurrency = false; // Default to false for legacy system
      }
    }

    if (!hasEnoughCurrency) {
      return NextResponse.json({ 
        error: `Insufficient ${paymentMethod === 'tickets' ? 'Tickets' : 'Hamster Coins'}`,
        paymentMethod,
        requiredAmount: paymentMethod === 'tickets' ? GACHA_TICKET_COST : GACHA_COIN_COST
      }, { status: 400 });
    }

    // Get all active gacha items
    const gachaItems = await GachaItem.find({ isActive: true });
    
    if (gachaItems.length === 0) {
      return NextResponse.json({ error: 'No gacha items available' }, { status: 400 });
    }

    // Calculate total drop rate and create weighted selection
    const totalDropRate = gachaItems.reduce((sum: number, item: any) => sum + item.dropRate, 0);
    
    if (totalDropRate === 0) {
      return NextResponse.json({ error: 'No valid drop rates configured' }, { status: 400 });
    }

    // Generate random number for weighted selection
    const random = Math.random() * totalDropRate;
    let currentSum = 0;
    let selectedItem = null;

    for (const item of gachaItems) {
      currentSum += item.dropRate;
      if (random <= currentSum) {
        selectedItem = item;
        break;
      }
    }

    // Fallback to first item if no selection (shouldn't happen with proper drop rates)
    if (!selectedItem) {
      selectedItem = gachaItems[0];
    }

    // Deduct payment from user's balance
    if (paymentType === 'tickets') {
      // Deduct tickets
      const ticketUpdateResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({
          action: 'spend',
          amount: GACHA_TICKET_COST,
          reason: 'gacha pull'
        })
      });
      
      if (!ticketUpdateResponse.ok) {
        return NextResponse.json({ error: 'Failed to deduct tickets' }, { status: 500 });
      }
    } else {
      // Deduct Hamster Coins
      if (EnhancedUser) {
        // Use enhanced user model
        const user = await EnhancedUser.findOne({ discordId: userId });
        user.currency.hamsterCoins -= GACHA_COIN_COST;
        user.currency.totalSpent += GACHA_COIN_COST;
        user.updatedAt = new Date();
        await user.save();
      } else {
        // Legacy system
        // const userCurrency = await Currency.findOne({ userId });
        // userCurrency.hamsterCoins -= GACHA_COIN_COST;
        // userCurrency.totalSpent += GACHA_COIN_COST;
        // userCurrency.updatedAt = new Date();
        // await userCurrency.save();
        // Legacy system disabled - no currency deduction
      }
    }

    // Record the pull
    const pullRecord = new GachaPull({
      userId,
      itemId: selectedItem._id.toString(),
      itemName: selectedItem.name,
      itemRarity: selectedItem.rarity,
      cost: paymentType === 'tickets' ? 0 : GACHA_COIN_COST
    });

    await pullRecord.save();

    return NextResponse.json({
      success: true,
      item: {
        id: selectedItem._id.toString(),
        name: selectedItem.name,
        description: selectedItem.description,
        image: selectedItem.image,
        rarity: selectedItem.rarity,
        dropRate: selectedItem.dropRate
      },
      pullId: pullRecord._id.toString(),
      cost: cost,
      paymentType: paymentType
    });

  } catch (error) {
    console.error('Gacha pull error:', error);
    return NextResponse.json({ error: 'Failed to perform gacha pull' }, { status: 500 });
  }
}

// GET - Get user's gacha pull history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    
    await connectDB();
    
    const mongoose = await import('mongoose');

    // Gacha pull history schema
    const gachaPullSchema = new mongoose.Schema({
      userId: { type: String, required: true },
      itemId: { type: String, required: true },
      itemName: { type: String, required: true },
      itemRarity: { type: String, required: true },
      pullDate: { type: Date, default: Date.now },
      cost: { type: Number, default: 10 }
    });

    const GachaPull = mongoose.models.GachaPull || mongoose.model('GachaPull', gachaPullSchema);

    const pulls = await GachaPull.find({ userId })
      .sort({ pullDate: -1 })
      .limit(limit);

    return NextResponse.json({
      success: true,
      pulls: pulls.map((pull: any) => ({
        id: pull._id.toString(),
        itemName: pull.itemName,
        itemRarity: pull.itemRarity,
        pullDate: pull.pullDate,
        cost: pull.cost
      }))
    });

  } catch (error) {
    console.error('Error fetching gacha history:', error);
    return NextResponse.json({ error: 'Failed to fetch gacha history' }, { status: 500 });
  }
}