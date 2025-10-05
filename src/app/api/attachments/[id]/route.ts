import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../config/database';
import ProjectTask from '../../../../../models/Task';
import mongoose from 'mongoose';
import { unlink } from 'fs/promises';
import { join } from 'path';

// DELETE /api/attachments/[id] - Delete an attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const resolvedParams = await params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid attachment ID format' }, { status: 400 });
    }
    
    // Find the task that contains this attachment
    const task = await ProjectTask.findOne({
      'attachments._id': resolvedParams.id
    });

    if (!task) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Find the attachment
    const attachment = task.attachments.find((att: any) => att._id.toString() === resolvedParams.id);
    
    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Delete the file from the filesystem
    try {
      const filePath = join(process.cwd(), 'public', attachment.filePath);
      await unlink(filePath);
    } catch (fileError) {
      console.warn('Could not delete file from filesystem:', fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Remove the attachment from the task using Mongoose method
    task.attachments.pull(resolvedParams.id);
    await task.save();

    return NextResponse.json({
      success: true,
      message: 'Attachment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting attachment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
