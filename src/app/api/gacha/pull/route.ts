import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('MongoDB Connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

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

// Currency schema
const currencySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  hamsterCoins: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
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
const Currency = mongoose.models.Currency || mongoose.model('Currency', currencySchema);
const GachaPull = mongoose.models.GachaPull || mongoose.model('GachaPull', gachaPullSchema);

// Gacha pull cost
const GACHA_COST = 10; // 10 Hamster Coins per pull

// POST - Perform a gacha pull
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await connectDB();

    // Get user's currency balance
    let userCurrency = await Currency.findOne({ userId });
    
    if (!userCurrency) {
      // Create new currency account if it doesn't exist
      userCurrency = new Currency({
        userId,
        hamsterCoins: 0,
        totalEarned: 0,
        totalSpent: 0
      });
    }

    // Check if user has enough coins
    if (userCurrency.hamsterCoins < GACHA_COST) {
      return NextResponse.json({ 
        error: 'Insufficient Hamster Coins',
        currentBalance: userCurrency.hamsterCoins,
        requiredAmount: GACHA_COST
      }, { status: 400 });
    }

    // Get all active gacha items
    const gachaItems = await GachaItem.find({ isActive: true });
    
    if (gachaItems.length === 0) {
      return NextResponse.json({ error: 'No gacha items available' }, { status: 400 });
    }

    // Calculate total drop rate and create weighted selection
    const totalDropRate = gachaItems.reduce((sum, item) => sum + item.dropRate, 0);
    
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

    // Deduct coins from user's balance
    userCurrency.hamsterCoins -= GACHA_COST;
    userCurrency.totalSpent += GACHA_COST;
    userCurrency.updatedAt = new Date();
    await userCurrency.save();

    // Record the pull
    const pullRecord = new GachaPull({
      userId,
      itemId: selectedItem._id.toString(),
      itemName: selectedItem.name,
      itemRarity: selectedItem.rarity,
      cost: GACHA_COST
    });
    await pullRecord.save();

    // Return the pulled item
    const pulledItem = {
      id: selectedItem._id.toString(),
      name: selectedItem.name,
      description: selectedItem.description,
      image: selectedItem.image,
      rarity: selectedItem.rarity,
      dropRate: selectedItem.dropRate
    };

    return NextResponse.json({ 
      success: true,
      message: 'Gacha pull successful!',
      item: pulledItem,
      newBalance: userCurrency.hamsterCoins,
      cost: GACHA_COST
    });

  } catch (error) {
    console.error('Error performing gacha pull:', error);
    return NextResponse.json({ error: 'Failed to perform gacha pull' }, { status: 500 });
  }
}
