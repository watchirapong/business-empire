import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../config/database';
import Section from '../../../../../models/Section';

// GET /api/mongo/sections - Get sections for a project
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const sections = await Section.find({
      projectId: projectId,
      isArchived: false
    }).sort({ position: 1 });

    return NextResponse.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error);
    return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 });
  }
}

// POST /api/mongo/sections - Create a new section
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { name, description, projectId, createdById } = body;

    if (!name || !projectId || !createdById) {
      return NextResponse.json({ error: 'Name, project ID, and created by ID are required' }, { status: 400 });
    }

    // Get the next position for the section
    const lastSection = await Section.findOne({
      projectId: projectId
    }).sort({ position: -1 });

    const position = lastSection ? lastSection.position + 1 : 0;

    const section = new Section({
      name,
      description,
      projectId,
      createdById,
      position
    });

    await section.save();

    return NextResponse.json(section);
  } catch (error) {
    console.error('Error creating section:', error);
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
  }
}

// DELETE /api/mongo/sections - Delete a section
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { sectionId } = body;

    if (!sectionId) {
      return NextResponse.json({ error: 'Section ID is required' }, { status: 400 });
    }

    console.log('🗑️ Deleting section:', sectionId);

    // Delete the section
    const deletedSection = await Section.findByIdAndDelete(sectionId);

    if (!deletedSection) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    console.log('✅ Section deleted successfully:', deletedSection.name);

    return NextResponse.json({ 
      message: 'Section deleted successfully',
      deletedSection 
    });
  } catch (error) {
    console.error('Error deleting section:', error);
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  }
}
