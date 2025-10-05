import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../config/database';
import Project from '../../../../../models/Project';
import ProjectTask from '../../../../../models/Task';

// GET /api/analytics/project-progress - Get project progress analytics
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const userId = searchParams.get('userId');

    const query: any = {};
    
    if (projectId) {
      query.projectId = projectId;
    }
    
    if (userId) {
      query.$or = [
        { ownerId: userId },
        { 'members.userId': userId }
      ];
    }

    const projects = await Project.find(query);
    const projectIds = projects.map(p => p._id);

    // Get task statistics for each project
    const taskStats = await ProjectTask.aggregate([
      {
        $match: {
          projectId: { $in: projectIds }
        }
      },
      {
        $group: {
          _id: '$projectId',
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          inProgressTasks: {
            $sum: {
              $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0]
            }
          },
          notStartedTasks: {
            $sum: {
              $cond: [{ $eq: ['$status', 'not_started'] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Calculate progress percentages
    const projectProgress = projects.map(project => {
      const stats = taskStats.find(s => s._id.toString() === project._id.toString());
      const totalTasks = stats?.totalTasks || 0;
      const completedTasks = stats?.completedTasks || 0;
      const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        projectId: project._id,
        projectName: project.name,
        projectColor: project.color,
        totalTasks,
        completedTasks,
        inProgressTasks: stats?.inProgressTasks || 0,
        notStartedTasks: stats?.notStartedTasks || 0,
        progressPercentage,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      };
    });

    // Calculate overall statistics
    const overallStats = {
      totalProjects: projects.length,
      totalTasks: taskStats.reduce((sum, stat) => sum + stat.totalTasks, 0),
      totalCompletedTasks: taskStats.reduce((sum, stat) => sum + stat.completedTasks, 0),
      averageProgress: projectProgress.length > 0 
        ? Math.round(projectProgress.reduce((sum, p) => sum + p.progressPercentage, 0) / projectProgress.length)
        : 0
    };

    return NextResponse.json({
      success: true,
      projectProgress,
      overallStats
    });

  } catch (error) {
    console.error('Error fetching project progress analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
