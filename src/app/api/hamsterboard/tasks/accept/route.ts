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
    const username = (session.user as any).username || (session.user as any).name;

    // Find the task
    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if task is open
    if (task.status !== 'open') {
      return NextResponse.json({ error: 'Task is not available for acceptance' }, { status: 400 });
    }

    // Check if user is trying to accept their own task
    if (task.postedBy?.id === userId) {
      return NextResponse.json({ error: 'You cannot accept your own task' }, { status: 400 });
    }

    // Update task status to accepted
    task.status = 'accepted';
    task.acceptedBy = {
      id: userId,
      username: username
    };
    task.acceptedAt = new Date();

    await task.save();

    return NextResponse.json({ 
      message: 'Task accepted successfully',
      task: task.toObject()
    });
  } catch (error) {
    console.error('Error accepting task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
