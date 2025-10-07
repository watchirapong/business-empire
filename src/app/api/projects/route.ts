import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

// Define schemas locally for API routes
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  ownerId: { type: String, required: true },
  members: [{
    userId: { type: String, required: true },
    role: { type: String, default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  isArchived: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  assignedTo: { type: String },
  status: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  dueDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
const ProjectTask = mongoose.models.ProjectTask || mongoose.model('ProjectTask', taskSchema);

// GET /api/projects - Get all projects for a user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || (session.user as any).id;

    const projects = await Project.find({
      $or: [
        { ownerId: userId },
        { 'members.userId': userId }
      ],
      isArchived: false
    })
    .sort({ createdAt: -1 });

    // Try to enhance user data with Discord nicknames
    try {
      let EnhancedUser;
      try {
        EnhancedUser = mongoose.model('EnhancedUser');
      } catch (error) {
        // Enhanced user model not available
      }

      if (EnhancedUser) {
        // Get all unique user IDs from projects
        const allUserIds = new Set<string>();
        projects.forEach(project => {
          if (project.ownerId) {
            allUserIds.add(project.ownerId);
          }
          if (project.members) {
            project.members.forEach((member: any) => {
              if (member.userId) {
                allUserIds.add(member.userId);
              }
            });
          }
        });

        // Get enhanced user data
        const enhancedUsers = await EnhancedUser.find({ discordId: { $in: Array.from(allUserIds) } });
        const enhancedUserMap = new Map();
        enhancedUsers.forEach(user => {
          enhancedUserMap.set(user.discordId, {
            discordNickname: user.discordServerData?.nickname,
            displayName: user.discordServerData?.nickname || user.globalName || user.username
          });
        });

        // Enhance project data with Discord nicknames
        projects.forEach(project => {
          // Enhance owner
          if (project.ownerId) {
            const enhancedData = enhancedUserMap.get(project.ownerId);
            if (enhancedData) {
              project.ownerDisplayName = enhancedData.displayName;
              project.ownerDiscordNickname = enhancedData.discordNickname;
            }
          }

          // Enhance members
          if (project.members) {
            project.members = project.members.map((member: any) => {
              const enhancedData = enhancedUserMap.get(member.userId);
              if (enhancedData) {
                return {
                  ...member.toObject(),
                  displayName: enhancedData.displayName,
                  discordNickname: enhancedData.discordNickname
                };
              }
              return member;
            });
          }
        });
      }
    } catch (error) {
      console.error('Error enhancing project data:', error);
    }

    // Add task counts to each project
    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const taskCount = await ProjectTask.countDocuments({ projectId: project._id });
        const completedTaskCount = await ProjectTask.countDocuments({ 
          projectId: project._id, 
          status: 'completed' 
        });

        return {
          ...project.toObject(),
          taskCount,
          completedTaskCount,
          completionRate: taskCount > 0 ? (completedTaskCount / taskCount) * 100 : 0
        };
      })
    );

    return NextResponse.json(projectsWithCounts);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { name, description, members = [] } = body;

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    // Try to get enhanced user data for the owner
    let ownerDisplayName = session.user.name || 'Unknown';
    let ownerDiscordNickname = null;

    try {
      let EnhancedUser;
      try {
        EnhancedUser = mongoose.model('EnhancedUser');
      } catch (error) {
        // Enhanced user model not available
      }

      if (EnhancedUser) {
        const enhancedUser = await EnhancedUser.findOne({ discordId: userId });
        if (enhancedUser) {
          ownerDisplayName = enhancedUser.discordServerData?.nickname || 
                            enhancedUser.globalName || 
                            enhancedUser.username || 
                            ownerDisplayName;
          ownerDiscordNickname = enhancedUser.discordServerData?.nickname;
        }
      }
    } catch (error) {
      console.error('Error fetching enhanced user data:', error);
    }

    const project = new Project({
      name: name.trim(),
      description: description || '',
      ownerId: userId,
      ownerDisplayName,
      ownerDiscordNickname,
      members: members.map((member: any) => ({
        userId: member.userId,
        role: member.role || 'member',
        joinedAt: new Date()
      })),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await project.save();

    return NextResponse.json({
      success: true,
      project: project.toObject()
    });

  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}