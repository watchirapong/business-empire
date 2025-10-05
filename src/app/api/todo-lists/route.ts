import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../config/database';
import TodoList from '../../../../models/TodoList';

// GET /api/todo-lists - Get all todo lists for a project
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const todoLists = await TodoList.find({ projectId })
      .populate('taskCount')
      .sort({ position: 1 });

    return NextResponse.json(todoLists);
  } catch (error) {
    console.error('Error fetching todo lists:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/todo-lists - Create a new todo list
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { name, description, projectId, createdById } = body;

    if (!name || !projectId || !createdById) {
      return NextResponse.json({ 
        error: 'Name, project ID, and creator ID are required' 
      }, { status: 400 });
    }

    // Get the next position for the todo list
    const lastList = await TodoList.findOne({ projectId }).sort({ position: -1 });
    const position = lastList ? lastList.position + 1 : 0;

    const todoList = new TodoList({
      name,
      description,
      projectId,
      createdById,
      position
    });

    await todoList.save();

    return NextResponse.json(todoList, { status: 201 });
  } catch (error) {
    console.error('Error creating todo list:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
