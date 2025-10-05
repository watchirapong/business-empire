import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../../config/database';
import TimeEntry from '../../../../../../models/TimeEntry';
import mongoose from 'mongoose';

// GET /api/tasks/[id]/time-entries - Get all time entries for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const resolvedParams = await params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid task ID format' }, { status: 400 });
    }
    
    const timeEntries = await TimeEntry.find({ taskId: resolvedParams.id })
      .sort({ createdAt: -1 });

    return NextResponse.json(timeEntries);
  } catch (error) {
    console.error('Error fetching time entries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks/[id]/time-entries - Create a new time entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { userId, duration, description } = body;

    if (!userId || !duration) {
      return NextResponse.json({ 
        error: 'User ID and duration are required' 
      }, { status: 400 });
    }

    const resolvedParams = await params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid task ID format' }, { status: 400 });
    }

    const timeEntry = new TimeEntry({
      taskId: resolvedParams.id,
      userId,
      duration,
      description,
      endTime: new Date()
    });

    await timeEntry.save();

    return NextResponse.json(timeEntry, { status: 201 });
  } catch (error) {
    console.error('Error creating time entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
