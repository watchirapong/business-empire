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

const GachaItem = mongoose.models.GachaItem || mongoose.model('GachaItem', gachaItemSchema);

// Check if user is admin
const isAdmin = (userId: string) => {
  const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917'];
  return ADMIN_USER_IDS.includes(userId);
};

// Default gacha items to seed
const defaultGachaItems = [
  // Common items (60% total drop rate)
  { name: 'Bronze Coin', description: 'A shiny bronze coin', image: '🥉', rarity: 'common', dropRate: 25 },
  { name: 'Basic Hamster Food', description: 'Standard hamster pellets', image: '🌾', rarity: 'common', dropRate: 20 },
  { name: 'Wooden Wheel', description: 'A simple wooden exercise wheel', image: '🎡', rarity: 'common', dropRate: 15 },
  
  // Rare items (25% total drop rate)
  { name: 'Silver Coin', description: 'A valuable silver coin', image: '🥈', rarity: 'rare', dropRate: 12 },
  { name: 'Premium Food', description: 'High-quality hamster treats', image: '🥜', rarity: 'rare', dropRate: 8 },
  { name: 'Cozy Bed', description: 'A comfortable sleeping spot', image: '🛏️', rarity: 'rare', dropRate: 5 },
  
  // Epic items (10% total drop rate)
  { name: 'Gold Coin', description: 'A precious gold coin', image: '🥇', rarity: 'epic', dropRate: 5 },
  { name: 'Luxury Cage', description: 'A spacious multi-level cage', image: '🏠', rarity: 'epic', dropRate: 3 },
  { name: 'Exercise Ball', description: 'A transparent exercise ball', image: '🔮', rarity: 'epic', dropRate: 2 },
  
  // Legendary items (4% total drop rate)
  { name: 'Diamond Ring', description: 'A sparkling diamond ring', image: '💍', rarity: 'legendary', dropRate: 2 },
  { name: 'Golden Wheel', description: 'A luxurious golden exercise wheel', image: '⭐', rarity: 'legendary', dropRate: 1.5 },
  { name: 'Royal Crown', description: 'Fit for a hamster king', image: '👑', rarity: 'legendary', dropRate: 0.5 },
  
  // Mythic items (1% total drop rate)
  { name: 'Rainbow Crystal', description: 'A mystical rainbow crystal', image: '🌈', rarity: 'mythic', dropRate: 0.5 },
  { name: 'Phoenix Feather', description: 'A legendary phoenix feather', image: '🔥', rarity: 'mythic', dropRate: 0.3 },
  { name: 'Unicorn Horn', description: 'The rarest of all treasures', image: '🦄', rarity: 'mythic', dropRate: 0.2 }
];

// POST - Seed default gacha items (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    // Check if items already exist
    const existingItems = await GachaItem.countDocuments();
    if (existingItems > 0) {
      return NextResponse.json({ 
        message: 'Gacha items already exist',
        existingCount: existingItems
      });
    }

    // Insert default items
    const insertedItems = await GachaItem.insertMany(defaultGachaItems);

    return NextResponse.json({ 
      message: 'Default gacha items seeded successfully',
      itemsAdded: insertedItems.length,
      items: insertedItems.map(item => ({
        id: item._id.toString(),
        name: item.name,
        description: item.description,
        image: item.image,
        rarity: item.rarity,
        dropRate: item.dropRate
      }))
    });

  } catch (error) {
    console.error('Error seeding gacha items:', error);
    return NextResponse.json({ error: 'Failed to seed gacha items' }, { status: 500 });
  }
}

// GET - Check seeding status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const itemCount = await GachaItem.countDocuments();
    const activeItemCount = await GachaItem.countDocuments({ isActive: true });

    return NextResponse.json({
      totalItems: itemCount,
      activeItems: activeItemCount,
      needsSeeding: itemCount === 0
    });

  } catch (error) {
    console.error('Error checking gacha seed status:', error);
    return NextResponse.json({ error: 'Failed to check seed status' }, { status: 500 });
  }
}
