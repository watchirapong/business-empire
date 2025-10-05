import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../../config/database';
import mongoose from 'mongoose';
import ProjectTemplate from '../../../../../../models/ProjectTemplate';

// POST /api/project-templates/[id]/use - Increment usage count for a template
export async function POST(
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
    
    // Import ProjectTemplate model
    const ProjectTemplate = (await import('../../../../../../models/ProjectTemplate')).default;
    
    const template = await ProjectTemplate.findByIdAndUpdate(
      resolvedParams.id,
      { $inc: { usageCount: 1 } },
      { new: true }
    );
    
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Usage count updated', usageCount: template.usageCount });
  } catch (error) {
    console.error('Error updating template usage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
