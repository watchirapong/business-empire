import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../config/database';
import Project from '../../../../models/Project';

// GET /api/projects - Get all projects for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const projects = await Project.find({
      $or: [
        { ownerId: userId },
        { 'members.userId': userId }
      ],
      isArchived: false
    })
    .populate('taskCount')
    .populate('completedTaskCount')
    .sort({ createdAt: -1 });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { name, description, color, icon, ownerId } = body;

    if (!name || !ownerId) {
      return NextResponse.json({ error: 'Name and owner ID are required' }, { status: 400 });
    }

    const project = new Project({
      name,
      description,
      color: color || '#3498db',
      icon: icon || '📁',
      ownerId,
      members: [{
        userId: ownerId,
        role: 'owner'
      }]
    });

    await project.save();

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
