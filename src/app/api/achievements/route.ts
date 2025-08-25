import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

// Define schemas locally for API routes
const achievementSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  icon: { type: String, required: true, default: '🏆' },
  rarity: { type: Number, required: true, min: 0, max: 100, default: 50 },
  category: { type: String, enum: ['Task', 'Goal', 'Quest'], default: 'Goal' },
  coinReward: { type: Number, required: true, min: 0, default: 100 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const Achievement = mongoose.models.Achievement || mongoose.model('Achievement', achievementSchema);

async function connectDB() {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
}

export async function GET() {
  try {
    await connectDB();
    
    const achievements = await Achievement.find({ isActive: true }).sort({ createdAt: -1 });
    
    return NextResponse.json({ achievements });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { title, description, icon, rarity, category, coinReward } = body;
    
    // Basic validation
    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }
    
    const achievement = new Achievement({
      title,
      description,
      icon: icon || '🏆',
      rarity: rarity || 50,
      category: category || 'Goal',
      coinReward: coinReward || 100
    });
    
    await achievement.save();
    
    return NextResponse.json({ achievement }, { status: 201 });
  } catch (error) {
    console.error('Error creating achievement:', error);
    return NextResponse.json({ error: 'Failed to create achievement' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Achievement ID is required' }, { status: 400 });
    }
    
    const body = await request.json();
    const { title, description, icon, rarity, category, coinReward } = body;
    
    // Basic validation
    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }
    
    const achievement = await Achievement.findByIdAndUpdate(
      id,
      { title, description, icon, rarity, category, coinReward },
      { new: true, runValidators: true }
    );
    
    if (!achievement) {
      return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
    }
    
    return NextResponse.json({ achievement });
  } catch (error) {
    console.error('Error updating achievement:', error);
    return NextResponse.json({ error: 'Failed to update achievement' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Achievement ID is required' }, { status: 400 });
    }
    
    const achievement = await Achievement.findByIdAndDelete(id);
    
    if (!achievement) {
      return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Achievement deleted successfully' });
  } catch (error) {
    console.error('Error deleting achievement:', error);
    return NextResponse.json({ error: 'Failed to delete achievement' }, { status: 500 });
  }
}
