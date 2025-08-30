import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Task from '@/models/Task';
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

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Check if current user is the task poster
    if (task.postedBy?.id !== userId) {
      return NextResponse.json({ error: 'You can only reset winners for your own tasks' }, { status: 403 });
    }

    // Reset winner and status
    task.winner = undefined;
    task.status = 'in_progress';
    task.completedAt = undefined;

    // Reset isWinner flags
    task.acceptedBy.forEach(acceptor => {
      acceptor.isWinner = false;
    });

    await task.save();

    return NextResponse.json({ 
      success: true,
      message: 'Winner reset successfully. Task is back to in_progress status.'
    });

  } catch (error) {
    console.error('Error resetting winner:', error);
    return NextResponse.json({ error: 'Failed to reset winner' }, { status: 500 });
  }
}
