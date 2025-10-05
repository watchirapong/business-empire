import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../config/database';
import ProjectTemplate from '../../../../models/ProjectTemplate';
import mongoose from 'mongoose';

// GET /api/project-templates - Get all project templates
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const publicOnly = searchParams.get('publicOnly') === 'true';

    const query: any = {};
    if (category) {
      query.category = category;
    }
    if (publicOnly) {
      query.isPublic = true;
    }

    const templates = await ProjectTemplate.find(query)
      .sort({ usageCount: -1, createdAt: -1 });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching project templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/project-templates - Create a new project template
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ 
        error: 'Invalid JSON in request body' 
      }, { status: 400 });
    }
    
    const { name, description, category, color, todoLists, isPublic, createdBy } = body;

    if (!name || !createdBy) {
      return NextResponse.json({ 
        error: 'Name and creator ID are required' 
      }, { status: 400 });
    }

    // Import ProjectTemplate model
    const ProjectTemplate = (await import('../../../../models/ProjectTemplate')).default;

    const template = new ProjectTemplate({
      name,
      description,
      category,
      color,
      todoLists,
      isPublic,
      createdBy
    });

    await template.save();

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating project template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
