import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../config/database';
import ProjectTask from '../../../../../models/Task';
import mongoose from 'mongoose';

// GET /api/tasks/[id] - Get a specific task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const resolvedParams = await params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid task ID format' }, { status: 400 });
    }
    
    const task = await ProjectTask.findById(resolvedParams.id)
      .populate('projectId', 'name color')
      .populate('todoListId', 'name');
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/tasks/[id] - Update a specific task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { title, description, priority, status, dueDate, assignedToId, isCompleted, labels, sectionId } = body;

    const resolvedParams = await params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid task ID format' }, { status: 400 });
    }
    
    const task = await ProjectTask.findById(resolvedParams.id);
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Update task fields
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) {
      task.status = status;
      if (status === 'completed' && !task.completedAt) {
        task.completedAt = new Date();
      } else if (status !== 'completed') {
        task.completedAt = undefined;
      }
    }
    if (isCompleted !== undefined) {
      task.isCompleted = isCompleted;
      if (isCompleted && !task.completedAt) {
        task.completedAt = new Date();
        task.status = 'completed';
      } else if (!isCompleted) {
        task.completedAt = undefined;
        task.status = 'not_started';
      }
    }
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (assignedToId !== undefined) task.assignedToId = assignedToId;
    if (labels !== undefined) task.labels = labels;
    if (sectionId !== undefined) task.sectionId = sectionId;

    task.updatedAt = new Date();
    await task.save();

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id] - Delete a specific task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const resolvedParams = await params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid task ID format' }, { status: 400 });
    }
    
    const task = await ProjectTask.findByIdAndDelete(resolvedParams.id);
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}