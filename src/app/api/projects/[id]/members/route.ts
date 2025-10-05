import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../../config/database';
import Project from '../../../../../../models/Project';
import mongoose from 'mongoose';

// POST /api/projects/[id]/members - Add a member to a project
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
    const { userId, role = 'member' } = body;

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 });
    }

    const project = await Project.findById(resolvedParams.id);
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if user is already a member
    const existingMember = project.members.find((member: any) => member.userId === userId);
    if (existingMember) {
      return NextResponse.json({ 
        error: 'User is already a member of this project' 
      }, { status: 409 });
    }

    // Add member to project
    project.members.push({ userId, role, joinedAt: new Date() });
    await project.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Member added successfully',
      project 
    });

  } catch (error) {
    console.error('Error adding project member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/members - Remove a member from a project
export async function DELETE(
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
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 });
    }

    const project = await Project.findById(resolvedParams.id);
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Remove member from project using Mongoose method
    project.members.pull({ userId });
    await project.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Member removed successfully',
      project 
    });

  } catch (error) {
    console.error('Error removing project member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
