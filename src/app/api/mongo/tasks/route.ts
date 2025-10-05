import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../config/database';
import ProjectTask from '../../../../../models/Task';
import Section from '../../../../../models/Section';

// GET /api/mongo/tasks - Get tasks for a project
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const tasks = await ProjectTask.find({
      projectId: projectId
    }).sort({ position: 1 });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST /api/mongo/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { title, projectId, sectionId, createdById, priority, dueDate, isCompleted } = body;

    if (!title || !projectId || !createdById) {
      return NextResponse.json({ error: 'Title, project ID, and created by ID are required' }, { status: 400 });
    }

    // Get the next position for the task
    const lastTask = await ProjectTask.findOne({
      projectId: projectId,
      sectionId: sectionId || null
    }).sort({ position: -1 });

    const position = lastTask ? lastTask.position + 1 : 0;

    const task = new ProjectTask({
      title,
      projectId,
      sectionId,
      createdById,
      priority: priority || 'low',
      dueDate: dueDate ? new Date(dueDate) : null,
      isCompleted: isCompleted || false,
      position
    });

    await task.save();

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

// PUT /api/mongo/tasks - Update a task
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { taskId, updates } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const task = await ProjectTask.findByIdAndUpdate(
      taskId,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE /api/mongo/tasks - Delete a task
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    
    console.log('🗑️ DELETE request for taskId:', taskId);
    
    if (!taskId) {
      console.log('❌ No taskId provided');
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    console.log('🔍 Looking for task with ID:', taskId);
    const task = await ProjectTask.findByIdAndDelete(taskId);

    if (!task) {
      console.log('❌ Task not found in database');
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    console.log('✅ Task deleted from database:', task.title);
    return NextResponse.json({ message: 'Task deleted successfully', deletedTask: task });
  } catch (error) {
    console.error('❌ Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
