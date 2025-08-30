import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import Task from '@/models/Task';

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

// Currency schema (re-defined here for API route context)
const currencySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  hamsterCoins: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Currency = mongoose.models.Currency || mongoose.model('Currency', currencySchema);

// Get or create user currency
const getUserCurrency = async (userId: string) => {
  try {
    let currency = await Currency.findOne({ userId });
    
    if (!currency) {
      currency = new Currency({
        userId,
        hamsterCoins: 0,
        totalEarned: 0
      });
      
      await currency.save();
    }
    
    return currency;
  } catch (error) {
    console.error('Error getting user currency:', error);
    throw error;
  }
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const userId = (session.user as any).id;

    let query: any = {};
    
    switch (filter) {
      case 'open':
        query = { status: 'open' };
        break;
      case 'my-tasks':
        query = { 'postedBy.id': userId };
        break;
      case 'my-accepted':
        query = { 'acceptedBy.id': userId };
        break;
      case 'task-history':
        query = { 
          'postedBy.id': userId,
          status: { $in: ['completed', 'cancelled'] }
        };
        break;
      case 'accepted-history':
        query = { 
          'acceptedBy.id': userId,
          status: { $in: ['completed', 'cancelled'] }
        };
        break;
      default:
        query = {};
    }

    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { taskName, description, reward, image } = await request.json();

    // Validate required fields
    if (!taskName || !description || !reward || !image) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (reward <= 0) {
      return NextResponse.json({ error: 'Reward must be greater than 0' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const username = (session.user as any).username || (session.user as any).name;

    // Check user balance
    const currency = await getUserCurrency(userId);
    if (currency.hamsterCoins < reward) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Deduct reward from user balance
    currency.hamsterCoins -= reward;
    currency.totalSpent += reward;
    await currency.save();

    // Create new task
    const task = new Task({
      taskName,
      description,
      reward,
      image,
      postedBy: {
        id: userId,
        username: username
      },
      status: 'open'
    });

    await task.save();

    return NextResponse.json({ 
      message: 'Task created successfully',
      task: task.toObject()
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
