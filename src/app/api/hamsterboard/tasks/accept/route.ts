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

    // Get user nickname
    const nickname = await getUserNickname(userId);
    if (!nickname) {
      return NextResponse.json({ error: 'Unable to get user nickname' }, { status: 400 });
    }

    // Find the task
    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if task is still available (open or in_progress)
    if (task.status !== 'open' && task.status !== 'in_progress') {
      return NextResponse.json({ error: 'Task is no longer available' }, { status: 400 });
    }

    // Check if user is trying to accept their own task
    if (task.postedBy?.id === userId) {
      return NextResponse.json({ error: 'You cannot accept your own task' }, { status: 400 });
    }

    // Check if user has already accepted this task
    const alreadyAccepted = task.acceptedBy.some(acceptor => acceptor.id === userId);
    if (alreadyAccepted) {
      return NextResponse.json({ error: 'You have already accepted this task' }, { status: 400 });
    }

    // Add user to acceptedBy array
    task.acceptedBy.push({
      id: userId,
      nickname: nickname,
      acceptedAt: new Date(),
      isWinner: false
    });

    // Change status to 'in_progress' if this is the first acceptance
    if (task.acceptedBy.length === 1) {
      task.status = 'in_progress';
    }

    await task.save();

    return NextResponse.json({ 
      success: true,
      message: 'Task accepted successfully'
    });

  } catch (error) {
    console.error('Error accepting task:', error);
    return NextResponse.json({ error: 'Failed to accept task' }, { status: 500 });
  }
}
