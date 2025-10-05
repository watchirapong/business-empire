import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../config/database';
import TimeEntry from '../../../../../models/TimeEntry';

// GET /api/time-tracking/summary - Get time tracking summary
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const projectId = searchParams.get('projectId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query: any = {};
    
    if (userId) {
      query.userId = userId;
    }
    
    if (projectId) {
      query.projectId = projectId;
    }
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const timeEntries = await TimeEntry.find(query)
      .populate('taskId', 'title projectId')
      .sort({ createdAt: -1 });

    // Calculate summary statistics
    const totalTime = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    const totalEntries = timeEntries.length;
    
    // Group by date
    const dailyStats = timeEntries.reduce((acc, entry) => {
      const date = entry.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, totalTime: 0, entries: 0 };
      }
      acc[date].totalTime += entry.duration || 0;
      acc[date].entries += 1;
      return acc;
    }, {} as any);

    // Group by project
    const projectStats = timeEntries.reduce((acc, entry) => {
      const projectId = (entry.taskId as any)?.projectId || 'unknown';
      if (!acc[projectId]) {
        acc[projectId] = { projectId, totalTime: 0, entries: 0 };
      }
      acc[projectId].totalTime += entry.duration || 0;
      acc[projectId].entries += 1;
      return acc;
    }, {} as any);

    return NextResponse.json({
      success: true,
      summary: {
        totalTime,
        totalEntries,
        averageTimePerEntry: totalEntries > 0 ? totalTime / totalEntries : 0
      },
      dailyStats: Object.values(dailyStats),
      projectStats: Object.values(projectStats),
      timeEntries: timeEntries.slice(0, 50) // Limit recent entries
    });

  } catch (error) {
    console.error('Error fetching time tracking summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
