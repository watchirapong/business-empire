import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../config/database';
import ProjectTask from '../../../../../models/Task';
import mongoose from 'mongoose';

// PUT /api/comments/[id] - Update a comment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const resolvedParams = await params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid comment ID format' }, { status: 400 });
    }
    
    const body = await request.json();
    const { content, userId } = body;

    if (!content || !userId) {
      return NextResponse.json({ 
        error: 'Content and user ID are required' 
      }, { status: 400 });
    }

    // Find the task that contains this comment
    const task = await ProjectTask.findOne({
      'comments._id': resolvedParams.id
    });

    if (!task) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Find and update the comment
    const comment = task.comments.find((comm: any) => comm._id.toString() === resolvedParams.id);
    
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user is the author of the comment
    if (comment.userId !== userId) {
      return NextResponse.json({ 
        error: 'You can only edit your own comments' 
      }, { status: 403 });
    }

    // Update the comment
    (comment as any).content = content;
    (comment as any).updatedAt = new Date();
    await task.save();

    return NextResponse.json({
      success: true,
      message: 'Comment updated successfully',
      comment
    });

  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/comments/[id] - Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const resolvedParams = await params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid comment ID format' }, { status: 400 });
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 });
    }

    // Find the task that contains this comment
    const task = await ProjectTask.findOne({
      'comments._id': resolvedParams.id
    });

    if (!task) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Find the comment
    const comment = task.comments.find((comm: any) => comm._id.toString() === resolvedParams.id);
    
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user is the author of the comment
    if (comment.userId !== userId) {
      return NextResponse.json({ 
        error: 'You can only delete your own comments' 
      }, { status: 403 });
    }

    // Remove the comment from the task using Mongoose method
    task.comments.pull(resolvedParams.id);
    await task.save();

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
