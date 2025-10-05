import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../config/database';
import ProjectTask from '../../../../../models/Task';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get tasks due within the next 24 hours
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const dueTasks = await ProjectTask.find({
      createdById: userId,
      dueDate: {
        $gte: now,
        $lte: tomorrow
      },
      isCompleted: false
    }).populate('projectId', 'name color icon');

    return NextResponse.json(dueTasks);
  } catch (error) {
    console.error('Error fetching due date tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch due date tasks' }, { status: 500 });
  }
}