import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Task from '@/models/Task';
import mongoose from 'mongoose';
import { getUserNicknames } from '@/lib/user-utils';

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

    const { taskId, winners } = await request.json();
    if (!taskId || !winners || !Array.isArray(winners) || winners.length === 0) {
      return NextResponse.json({ error: 'Task ID and winners array are required' }, { status: 400 });
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
      winners: task.winners,
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

    // Validate winners
    const totalReward = winners.reduce((sum, winner) => sum + (winner.reward || 0), 0);
    
    if (totalReward <= 0) {
      return NextResponse.json({ error: 'Total reward must be greater than 0' }, { status: 400 });
    }

    // Handle over-distribution by deducting extra from task poster's balance
    if (totalReward > task.reward) {
      const extraAmount = totalReward - task.reward;
      const posterCurrency = await getUserCurrency(userId);
      
      if (posterCurrency.hamsterCoins < extraAmount) {
        return NextResponse.json({ 
          error: `Insufficient balance. You need $${extraAmount.toFixed(2)} extra but only have $${posterCurrency.hamsterCoins.toFixed(2)}` 
        }, { status: 400 });
      }
      
      // Deduct extra amount from poster's balance
      posterCurrency.hamsterCoins -= extraAmount;
      posterCurrency.totalSpent += extraAmount;
      await posterCurrency.save();
    }

    // Get nicknames for all winners
    const winnerIds = winners.map(w => w.id);
    const winnerNicknames = await getUserNicknames(winnerIds);

    // Process each winner
    const processedWinners = [];
    for (const winnerData of winners) {
      const { id: winnerId, reward } = winnerData;
      
      // Check if winner has completed the task
      const winnerAcceptance = task.acceptedBy.find(acceptor => acceptor.id === winnerId);
      if (!winnerAcceptance) {
        return NextResponse.json({ error: `Winner ${winnerId} has not accepted this task` }, { status: 400 });
      }

      if (!winnerAcceptance.completedAt) {
        return NextResponse.json({ error: `Winner ${winnerId} has not completed this task` }, { status: 400 });
      }

      if (reward <= 0) {
        return NextResponse.json({ error: `Reward for ${winnerAcceptance.nickname} must be greater than 0` }, { status: 400 });
      }

      // Transfer reward to winner
      const winnerCurrency = await getUserCurrency(winnerId);
      winnerCurrency.hamsterCoins += reward;
      winnerCurrency.totalEarned += reward;
      await winnerCurrency.save();

      // Mark the winner in acceptedBy array
      winnerAcceptance.isWinner = true;

      processedWinners.push({
        id: winnerId,
        nickname: winnerNicknames[winnerId] || 'Unknown User',
        reward: reward
      });
    }

    // Update task with multiple winners
    task.winners = processedWinners.map(winner => ({
      id: winner.id,
      nickname: winner.nickname,
      selectedAt: new Date(),
      reward: winner.reward
    })) as any;
    task.status = 'completed';
    task.completedAt = new Date();

    await task.save();

    return NextResponse.json({ 
      success: true,
      message: 'Winners selected successfully! Rewards have been transferred and task has been completed.',
      winners: processedWinners
    });

  } catch (error) {
    console.error('Error selecting winners:', error);
    return NextResponse.json({ error: 'Failed to select winners' }, { status: 500 });
  }
}
