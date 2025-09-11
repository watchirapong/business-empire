import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Task from '@/models/Task';
import mongoose from 'mongoose';
import { getUserNickname } from '@/lib/user-utils';

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
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, winnerId } = await request.json();
    if (!taskId || !winnerId) {
      return NextResponse.json({ error: 'Task ID and winner ID are required' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    // Find the task
    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    console.log('Task data:', {
      id: task._id,
      status: task.status,
      winner: task.winner,
      acceptedByCount: task.acceptedBy.length,
      completedCount: task.acceptedBy.filter(a => a.completedAt).length
    });

    // Check if current user is the task poster
    if (task.postedBy?.id !== userId) {
      return NextResponse.json({ error: 'You can only select winners for your own tasks' }, { status: 403 });
    }

    // Check if task is in progress
    if (task.status !== 'in_progress') {
      return NextResponse.json({ error: 'Task is not in progress' }, { status: 400 });
    }

    // Check if winner has completed the task
    const winnerAcceptance = task.acceptedBy.find(acceptor => acceptor.id === winnerId);
    if (!winnerAcceptance) {
      return NextResponse.json({ error: 'Selected winner has not accepted this task' }, { status: 400 });
    }

    if (!winnerAcceptance.completedAt) {
      return NextResponse.json({ error: 'Selected winner has not completed this task' }, { status: 400 });
    }

    // Check if winner has already been selected
    if (task.winner && task.winner.id) {
      console.log('Task already has winner:', task.winner);
      return NextResponse.json({ error: 'Winner has already been selected for this task' }, { status: 400 });
    }

    // Transfer reward to winner
    const winnerCurrency = await getUserCurrency(winnerId);
    winnerCurrency.hamsterCoins += task.reward;
    winnerCurrency.totalEarned += task.reward;
    await winnerCurrency.save();

    // Get winner nickname
    const winnerNickname = await getUserNickname(winnerId);

    // Mark winner and complete task
    task.winner = {
      id: winnerId,
      nickname: winnerNickname || 'Unknown User',
      selectedAt: new Date()
    };
    task.status = 'completed';
    task.completedAt = new Date();

    // Mark the winner in acceptedBy array
    winnerAcceptance.isWinner = true;

    await task.save();

    // Delete the task after completion
    await Task.findByIdAndDelete(taskId);

    return NextResponse.json({
      success: true,
      message: 'Winner selected successfully! Reward has been transferred and task has been deleted.',
      winner: {
        id: winnerId,
        nickname: winnerNickname || 'Unknown User',
        reward: task.reward
      }
    });

  } catch (error) {
    console.error('Error selecting winner:', error);
    return NextResponse.json({ error: 'Failed to select winner' }, { status: 500 });
  }
}
