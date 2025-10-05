import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../config/database';
import Project from '../../../../../models/Project';
import Section from '../../../../../models/Section';
import ProjectTask from '../../../../../models/Task';

// GET /api/mongo/projects - Get all projects with sections and tasks
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get all projects for the user
    const projects = await Project.find({
      $or: [
        { ownerId: userId },
        { 'members.userId': userId }
      ],
      isArchived: false
    }).sort({ createdAt: -1 });

    // For each project, get sections and tasks
    const projectsWithData = await Promise.all(
      projects.map(async (project) => {
        // Get sections for this project
        const sections = await Section.find({
          projectId: project._id,
          isArchived: false
        }).sort({ position: 1 });

        // Get tasks for this project
        const tasks = await ProjectTask.find({
          projectId: project._id
        }).sort({ position: 1 });

        return {
          ...project.toObject(),
          sections: sections.map(section => ({
            ...section.toObject(),
            tasks: tasks.filter(task => 
              task.sectionId && task.sectionId.toString() === section._id.toString()
            )
          })),
          unassignedTasks: tasks.filter(task => !task.sectionId)
        };
      })
    );

    return NextResponse.json(projectsWithData);
  } catch (error) {
    console.error('Error fetching projects with data:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST /api/mongo/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { name, description, color, icon, ownerId, organizationId } = body;

    if (!name || !ownerId) {
      return NextResponse.json({ error: 'Name and owner ID are required' }, { status: 400 });
    }

    const project = new Project({
      name,
      description,
      color: color || '#3498db',
      icon: icon || '📁',
      ownerId,
      organizationId
    });

    await project.save();

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
