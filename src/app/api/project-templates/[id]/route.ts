import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../config/database';
import mongoose from 'mongoose';

// GET /api/project-templates/[id] - Get a specific project template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const resolvedParams = await params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid template ID format' }, { status: 400 });
    }
    
    // Dynamic import to avoid model compilation issues
    const ProjectTemplate = (await import('../../../../../models/ProjectTemplate')).default;
    
    const template = await ProjectTemplate.findById(resolvedParams.id);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(template);

  } catch (error) {
    console.error('Error fetching project template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
