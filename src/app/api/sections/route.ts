import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../config/database';
import Section from '../../../../models/Section';

// GET /api/sections - Get all sections for a project
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const userId = searchParams.get('userId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const query: any = { projectId, isArchived: false };

    const sections = await Section.find(query)
      .sort({ position: 1 });

    return NextResponse.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/sections - Create a new section
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

    // Get the next position for the section
    const lastSection = await Section.findOne({ projectId })
      .sort({ position: -1 });

    const position = lastSection ? lastSection.position + 1 : 0;

    const section = new Section({
      name,
      description,
      projectId,
      createdById,
      position
    });

    await section.save();

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error('Error creating section:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/sections - Delete all sections for a project
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Delete all sections for the project
    const result = await Section.deleteMany({ projectId });

    return NextResponse.json({ 
      message: `Deleted ${result.deletedCount} sections successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting sections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
