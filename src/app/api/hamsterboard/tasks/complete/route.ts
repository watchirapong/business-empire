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

// User schema (re-defined here for API route context)
const userSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  balance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

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

    // Check if task is accepted
    if (task.status !== 'accepted') {
      return NextResponse.json({ error: 'Task is not in accepted status' }, { status: 400 });
    }

    // Check if current user is the one who accepted the task
    if (task.acceptedBy?.id !== userId) {
      return NextResponse.json({ error: 'You can only complete tasks you have accepted' }, { status: 403 });
    }

    // Find the user who posted the task (to verify they still exist)
    const posterUser = await User.findOne({ discordId: task.postedBy?.id });
    if (!posterUser) {
      return NextResponse.json({ error: 'Task poster not found' }, { status: 404 });
    }

    // Find the user who completed the task
    const completerUser = await User.findOne({ discordId: userId });
    if (!completerUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Transfer reward from poster to completer
    completerUser.balance += task.reward;
    await completerUser.save();

    // Update task status to completed
    task.status = 'completed';
    task.completedAt = new Date();

    await task.save();

    return NextResponse.json({ 
      message: 'Task completed successfully',
      reward: task.reward,
      task: task.toObject()
    });
  } catch (error) {
    console.error('Error completing task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
