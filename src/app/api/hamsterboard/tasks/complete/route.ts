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

    const { taskId, completionImage, completionDescription } = await request.json();
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    if (!completionDescription || !completionDescription.trim()) {
      return NextResponse.json({ error: 'Completion description is required' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    // Find the task
    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if task is in progress
    if (task.status !== 'in_progress') {
      return NextResponse.json({ error: 'Task is not in progress' }, { status: 400 });
    }

    // Check if user has accepted this task
    const userAcceptance = task.acceptedBy.find(acceptor => acceptor.id === userId);
    if (!userAcceptance) {
      return NextResponse.json({ error: 'You can only complete tasks you have accepted' }, { status: 403 });
    }

    // Check if user has already completed this task
    if (userAcceptance.completedAt) {
      return NextResponse.json({ error: 'You have already completed this task' }, { status: 400 });
    }

    // Update the user's completion
    userAcceptance.completedAt = new Date();
    userAcceptance.completionImage = completionImage || null;
    userAcceptance.completionDescription = completionDescription.trim();

    await task.save();

    return NextResponse.json({ 
      success: true,
      message: 'Task completed successfully! Waiting for poster to select winner.'
    });

  } catch (error) {
    console.error('Error completing task:', error);
    return NextResponse.json({ error: 'Failed to complete task' }, { status: 500 });
  }
}
