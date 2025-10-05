import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../../config/database';
import ProjectTask from '../../../../../../models/Task';
import Section from '../../../../../../models/Section';

// GET /api/projects/[id]/updates - Get recent updates for real-time collaboration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since') || new Date(Date.now() - 60000).toISOString(); // Last minute

    // Get recent task updates
    const recentTasks = await ProjectTask.find({
      projectId,
      updatedAt: { $gte: new Date(since) }
    }).sort({ updatedAt: -1 }).limit(50);

    // Get recent section updates
    const recentSections = await Section.find({
      projectId,
      updatedAt: { $gte: new Date(since) }
    }).sort({ updatedAt: -1 }).limit(20);

    const updates = [
      ...recentTasks.map(task => ({
        type: 'task_updated',
        data: task,
        timestamp: task.updatedAt.getTime(),
        userId: task.createdById
      })),
      ...recentSections.map(section => ({
        type: 'section_updated',
        data: section,
        timestamp: section.updatedAt.getTime(),
        userId: section.createdById
      }))
    ].sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json(updates);
  } catch (error) {
    console.error('Error fetching project updates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}