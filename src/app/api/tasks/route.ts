import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../config/database';
import ProjectTask from '../../../../models/Task';

// GET /api/tasks - Get all tasks for a project or user
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    const query: any = {};

    if (projectId) {
      query.projectId = projectId;
    }

    if (userId) {
      query.$or = [
        { assignedToId: userId },
        { createdById: userId }
      ];
    }

    if (status) {
      query.status = status;
    }

    const tasks = await ProjectTask.find(query)
      .populate('projectId', 'name color icon')
      .populate('sectionId', 'name')
      .sort({ position: 1 });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    console.log('Task creation API called with body:', body);
    
    const { 
      title, 
      description, 
      priority, 
      dueDate, 
      sectionId,
      todoListId, 
      projectId, 
      assignedToId, 
      createdById,
      labels,
      isCompleted
    } = body;

    if (!title || !projectId || !createdById) {
      return NextResponse.json({ 
        error: 'Title, project ID, and creator ID are required' 
      }, { status: 400 });
    }

    // Get the next position for the task
    const lastTask = await ProjectTask.findOne({
      ...(todoListId ? { todoListId } : { projectId, todoListId: null })
    }).sort({ position: -1 });

    const position = lastTask ? lastTask.position + 1 : 0;

    const task = new ProjectTask({
      title,
      description,
      priority: priority || 'P4',
      dueDate: dueDate ? new Date(dueDate) : null,
      sectionId: sectionId || null,
      todoListId: todoListId || null,
      projectId,
      assignedToId: assignedToId || null,
      createdById,
      labels: labels || [],
      isCompleted: isCompleted || false,
      position
    });

    await task.save();
    
    console.log('Task created successfully:', task);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
