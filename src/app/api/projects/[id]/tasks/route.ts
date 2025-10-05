import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../../config/database';
import ProjectTask from '../../../../../../models/Task';
import mongoose from 'mongoose';

// GET /api/projects/[id]/tasks - Get all tasks for a specific project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const resolvedParams = await params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    const query: any = { projectId: resolvedParams.id };
    
    if (status) {
      query.status = status;
    }
    
    if (userId) {
      query.assignedToId = userId;
    }

    const tasks = await ProjectTask.find(query)
      .populate('projectId', 'name color')
      .populate('todoListId', 'name')
      .sort({ position: 1, createdAt: -1 });

    return NextResponse.json(tasks);

  } catch (error) {
    console.error('Error fetching project tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects/[id]/tasks - Create a new task for a specific project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const resolvedParams = await params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
    }
    
    const body = await request.json();
    const { 
      title, 
      description, 
      priority, 
      dueDate, 
      todoListId, 
      assignedToId, 
      createdById 
    } = body;

    if (!title || !createdById) {
      return NextResponse.json({ 
        error: 'Title and creator ID are required' 
      }, { status: 400 });
    }

    // Get the next position for the task
    const lastTask = await ProjectTask.findOne({
      projectId: resolvedParams.id,
      ...(todoListId ? { todoListId } : { todoListId: null })
    }).sort({ position: -1 });

    const position = lastTask ? lastTask.position + 1 : 0;

    const task = new ProjectTask({
      title,
      description,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      todoListId: todoListId || null,
      projectId: resolvedParams.id,
      assignedToId: assignedToId || null,
      createdById,
      position
    });

    await task.save();

    // Populate the task with related data
    await task.populate('projectId', 'name color');
    await task.populate('todoListId', 'name');

    return NextResponse.json(task, { status: 201 });

  } catch (error) {
    console.error('Error creating project task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
