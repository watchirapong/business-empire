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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { taskId } = await request.json();

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    // Find the task
    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if current user is the one who posted the task
    if (task.postedBy?.id !== userId) {
      return NextResponse.json({ error: 'You can only cancel your own tasks' }, { status: 403 });
    }

    // Check if task is still open (not accepted or completed)
    if (task.status !== 'open') {
      return NextResponse.json({ error: 'Cannot cancel task that has been accepted or completed' }, { status: 400 });
    }

    // Find the user who posted the task
    const posterCurrency = await getUserCurrency(userId);

    // Refund the reward to the poster
    posterCurrency.hamsterCoins += task.reward;
    posterCurrency.totalSpent -= task.reward;
    await posterCurrency.save();

    // Delete the task
    await Task.findByIdAndDelete(taskId);

    return NextResponse.json({ 
      message: 'Task cancelled successfully',
      refundedAmount: task.reward
    });
  } catch (error) {
    console.error('Error cancelling task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
