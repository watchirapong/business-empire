import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

// Task Schema
const taskSchema = new mongoose.Schema({
  taskName: { type: String, required: true },
  description: { type: String, required: true },
  reward: { type: Number, required: true },
  image: { type: String, required: true },
  postedBy: {
    id: { type: String, required: true },
    nickname: { type: String, required: true }
  },
  acceptedBy: [{
    id: { type: String, required: true },
    nickname: { type: String, required: true },
    acceptedAt: { type: Date, default: Date.now }
  }],
  status: { 
    type: String, 
    enum: ['open', 'in-progress', 'completed', 'cancelled'], 
    default: 'open' 
  },
  winners: [{
    id: { type: String, required: true },
    nickname: { type: String, required: true },
    reward: { type: Number, required: true }
  }],
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

// Helper function to get user nickname from enhanced user model or legacy system
const getUserNickname = async (userId: string): Promise<string | null> => {
  try {
    // Try to use enhanced user model first
    let EnhancedUser;
    let User: any;
    
    try {
      EnhancedUser = mongoose.model('EnhancedUser');
    } catch (error) {
      User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
        discordId: String,
        username: String,
        globalName: String
      }));
    }

    if (EnhancedUser) {
      // Use enhanced user model
      const user = await EnhancedUser.findOne({ discordId: userId });
      if (user) {
        // Priority: Discord nickname > globalName > username
        return user.discordServerData?.nickname || 
               user.globalName || 
               user.username || 
               `User${userId.slice(-4)}`;
      }
    } else {
      // Legacy system
      const user = await User.findOne({ discordId: userId });
      if (user) {
        return user.globalName || user.username || `User${userId.slice(-4)}`;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting user nickname:', error);
    return null;
  }
};

// Helper function to get user currency from enhanced user model or legacy system
const getUserCurrency = async (userId: string) => {
  try {
    // Try to use enhanced user model first
    let EnhancedUser;
    let Currency: any;
    
    try {
      EnhancedUser = mongoose.model('EnhancedUser');
    } catch (error) {
      Currency = mongoose.models.Currency || mongoose.model('Currency', new mongoose.Schema({
        userId: { type: String, required: true, unique: true },
        hamsterCoins: { type: Number, default: 0 },
        totalEarned: { type: Number, default: 0 },
        totalSpent: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
      }));
    }

    if (EnhancedUser) {
      // Use enhanced user model
      const user = await EnhancedUser.findOne({ discordId: userId });
      if (user) {
        return {
          hamsterCoins: user.currency?.hamsterCoins || 0,
          totalEarned: user.currency?.totalEarned || 0,
          totalSpent: user.currency?.totalSpent || 0,
          save: async () => {
            user.updatedAt = new Date();
            await user.save();
          }
        };
      } else {
        // Create new enhanced user with default currency
        const newUser = new EnhancedUser({
          discordId: userId,
          username: 'Unknown',
          email: `${userId}@discord.local`,
          currency: {
            hamsterCoins: 100,
            totalEarned: 100,
            totalSpent: 0
          }
        });
        await newUser.save();
        return {
          hamsterCoins: 100,
          totalEarned: 100,
          totalSpent: 0,
          save: async () => {
            newUser.updatedAt = new Date();
            await newUser.save();
          }
        };
      }
    } else {
      // Legacy system
      let currency = await Currency.findOne({ userId });
      if (!currency) {
        currency = new Currency({
          userId,
          hamsterCoins: 0,
          totalEarned: 0,
          totalSpent: 0
        });
        await currency.save();
      }
      return currency;
    }
  } catch (error) {
    console.error('Error getting user currency:', error);
    throw error;
  }
};

// Helper function to get multiple user nicknames
const getUserNicknames = async (userIds: string[]): Promise<Record<string, string>> => {
  const nicknames: Record<string, string> = {};
  
  try {
    // Try to use enhanced user model first
    let EnhancedUser;
    let User: any;
    
    try {
      EnhancedUser = mongoose.model('EnhancedUser');
    } catch (error) {
      User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
        discordId: String,
        username: String,
        globalName: String
      }));
    }

    if (EnhancedUser) {
      // Use enhanced user model
      const users = await EnhancedUser.find({ discordId: { $in: userIds } });
      users.forEach((user: any) => {
        const nickname = user.discordServerData?.nickname || 
                        user.globalName || 
                        user.username || 
                        `User${user.discordId.slice(-4)}`;
        nicknames[user.discordId] = nickname;
      });
    } else {
      // Legacy system
      const users = await User.find({ discordId: { $in: userIds } });
      users.forEach((user: any) => {
        const nickname = user.globalName || user.username || `User${user.discordId.slice(-4)}`;
        nicknames[user.discordId] = nickname;
      });
    }
  } catch (error) {
    console.error('Error getting user nicknames:', error);
  }
  
  return nicknames;
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

    // Collect all user IDs from tasks to fetch nicknames
    const userIds = new Set<string>();

    tasks.forEach((task: any) => {
      // Add postedBy user ID
      if (task.postedBy?.id) {
        userIds.add(task.postedBy.id);
      }

      // Add acceptedBy user IDs
      if (task.acceptedBy && Array.isArray(task.acceptedBy)) {
        task.acceptedBy.forEach((acceptor: any) => {
          if (acceptor.id) {
            userIds.add(acceptor.id);
          }
        });
      }

      // Add winners user IDs
      if (task.winners && Array.isArray(task.winners)) {
        task.winners.forEach((winner: any) => {
          if (winner.id) {
            userIds.add(winner.id);
          }
        });
      }
    });

    // Fetch all nicknames in batch
    const userIdArray = Array.from(userIds);
    const nicknames = await getUserNicknames(userIdArray);

    // Update tasks with current nicknames
    const tasksWithNicknames = tasks.map((task: any) => ({
      ...task,
      postedBy: {
        ...task.postedBy,
        currentNickname: nicknames[task.postedBy.id] || task.postedBy.nickname
      },
      acceptedBy: task.acceptedBy?.map((acceptor: any) => ({
        ...acceptor,
        currentNickname: nicknames[acceptor.id] || acceptor.nickname
      })) || [],
      winners: task.winners?.map((winner: any) => ({
        ...winner,
        currentNickname: nicknames[winner.id] || winner.nickname
      })) || []
    }));

    return NextResponse.json({ 
      tasks: tasksWithNicknames,
      source: 'enhanced'
    });

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

    // Get user nickname
    const nickname = await getUserNickname(userId);
    if (!nickname) {
      return NextResponse.json({ error: 'Unable to get user nickname' }, { status: 400 });
    }

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
        nickname: nickname
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