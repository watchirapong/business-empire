import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../config/database';
import ProjectTask from '../../../../../models/Task';

// PUT /api/tasks/reorder - Reorder tasks within a section or move between sections
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { taskId, newPosition, newSectionId, projectId } = body;

    if (!taskId || newPosition === undefined || !projectId) {
      return NextResponse.json({ 
        error: 'Task ID, new position, and project ID are required' 
      }, { status: 400 });
    }

    const task = await ProjectTask.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const oldSectionId = task.sectionId;
    const oldPosition = task.position;

    // If moving to a different section
    if (newSectionId && newSectionId !== oldSectionId?.toString()) {
      // Update the task's section and position
      task.sectionId = newSectionId;
      task.position = newPosition;

      // Reorder tasks in the old section (shift positions up)
      if (oldSectionId) {
        await ProjectTask.updateMany(
          { 
            sectionId: oldSectionId, 
            position: { $gt: oldPosition },
            _id: { $ne: taskId }
          },
          { $inc: { position: -1 } }
        );
      }

      // Reorder tasks in the new section (shift positions down)
      await ProjectTask.updateMany(
        { 
          sectionId: newSectionId, 
          position: { $gte: newPosition },
          _id: { $ne: taskId }
        },
        { $inc: { position: 1 } }
      );
    } else {
      // Reordering within the same section
      const sectionId = newSectionId || oldSectionId;
      
      if (newPosition > oldPosition) {
        // Moving down: shift tasks between old and new position up
        await ProjectTask.updateMany(
          { 
            sectionId: sectionId,
            position: { $gt: oldPosition, $lte: newPosition },
            _id: { $ne: taskId }
          },
          { $inc: { position: -1 } }
        );
      } else {
        // Moving up: shift tasks between new and old position down
        await ProjectTask.updateMany(
          { 
            sectionId: sectionId,
            position: { $gte: newPosition, $lt: oldPosition },
            _id: { $ne: taskId }
          },
          { $inc: { position: 1 } }
        );
      }
      
      task.position = newPosition;
    }

    await task.save();

    return NextResponse.json({ 
      success: true, 
      task: {
        _id: task._id,
        position: task.position,
        sectionId: task.sectionId
      }
    });
  } catch (error) {
    console.error('Error reordering task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}