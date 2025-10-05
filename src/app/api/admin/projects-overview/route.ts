import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../config/database';
import Project from '../../../../../models/Project';
import ProjectTask from '../../../../../models/Task';
import Section from '../../../../../models/Section';
import User from '../../../../../models/User';

// GET /api/admin/projects-overview - Get comprehensive project overview for admins
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get all projects with their details
    const projects = await Project.find({ isArchived: false })
      .populate('ownerId', 'username email')
      .sort({ createdAt: -1 });

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
          owner: project.ownerId,
          memberCount: project.members.length,
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
      }
    });
  } catch (error) {
    console.error('Error fetching projects overview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
