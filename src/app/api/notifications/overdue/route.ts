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

    // Get overdue tasks
    const now = new Date();

    const overdueTasks = await ProjectTask.find({
      createdById: userId,
      dueDate: {
        $lt: now
      },
      isCompleted: false
    }).populate('projectId', 'name color icon');

    return NextResponse.json(overdueTasks);
  } catch (error) {
    console.error('Error fetching overdue tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch overdue tasks' }, { status: 500 });
  }
}