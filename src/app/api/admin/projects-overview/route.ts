import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';
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

const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  position: { type: Number, default: 0 },
  isArchived: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  email: { type: String },
  globalName: { type: String },
  avatar: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
const ProjectTask = mongoose.models.ProjectTask || mongoose.model('ProjectTask', taskSchema);
const Section = mongoose.models.Section || mongoose.model('Section', sectionSchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);

// GET /api/admin/projects-overview - Get comprehensive project overview for admins
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userId = (session.user as any).id;
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    
    // Get all projects with their details
    const projects = await Project.find({ isArchived: false })
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
            displayName: user.discordServerData?.nickname || user.globalName || user.username,
            username: user.username,
            globalName: user.globalName,
            avatar: user.avatar
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
              project.ownerUsername = enhancedData.username;
              project.ownerGlobalName = enhancedData.globalName;
              project.ownerAvatar = enhancedData.avatar;
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
                  discordNickname: enhancedData.discordNickname,
                  username: enhancedData.username,
                  globalName: enhancedData.globalName,
                  avatar: enhancedData.avatar
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

    // Get project statistics
    const projectStats = await Promise.all(
      projects.map(async (project) => {
        const taskCount = await ProjectTask.countDocuments({ projectId: project._id });
        const completedTaskCount = await ProjectTask.countDocuments({ 
          projectId: project._id, 
          status: 'completed' 
        });
        const sectionCount = await Section.countDocuments({ 
          projectId: project._id, 
          isArchived: false 
        });
        
        return {
          projectId: project._id,
          projectName: project.name,
          owner: {
            userId: project.ownerId,
            displayName: project.ownerDisplayName || `User${project.ownerId.slice(-4)}`,
            discordNickname: project.ownerDiscordNickname,
            username: project.ownerUsername,
            globalName: project.ownerGlobalName,
            avatar: project.ownerAvatar
          },
          memberCount: project.members.length,
          members: project.members.map((member: any) => ({
            userId: member.userId,
            displayName: member.displayName || `User${member.userId.slice(-4)}`,
            discordNickname: member.discordNickname,
            username: member.username,
            globalName: member.globalName,
            avatar: member.avatar,
            role: member.role,
            joinedAt: member.joinedAt
          })),
          taskCount,
          completedTaskCount,
          sectionCount,
          completionRate: taskCount > 0 ? (completedTaskCount / taskCount) * 100 : 0,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        };
      })
    );

    // Get overall statistics
    const totalProjects = projects.length;
    const totalTasks = await ProjectTask.countDocuments();
    const totalCompletedTasks = await ProjectTask.countDocuments({ status: 'completed' });
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalSections = await Section.countDocuments({ isArchived: false });

    const overallStats = {
      totalProjects,
      totalTasks,
      totalCompletedTasks,
      totalUsers,
      totalSections,
      overallCompletionRate: totalTasks > 0 ? (totalCompletedTasks / totalTasks) * 100 : 0
    };

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentProjects = await Project.find({
      createdAt: { $gte: sevenDaysAgo }
    }).sort({ createdAt: -1 }).limit(5);

    const recentTasks = await ProjectTask.find({
      createdAt: { $gte: sevenDaysAgo }
    }).populate('projectId', 'name').sort({ createdAt: -1 }).limit(10);

    return NextResponse.json({
      projectStats,
      overallStats,
      recentActivity: {
        recentProjects,
        recentTasks
      },
      source: 'enhanced'
    });
  } catch (error) {
    console.error('Error fetching projects overview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}