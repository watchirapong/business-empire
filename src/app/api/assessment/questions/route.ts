import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import AssessmentQuestion from '@/models/AssessmentQuestion';

// GET - Fetch questions for a specific phase and path, or all questions for admin
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Assessment Questions API - Session:', session?.user?.id);
    
    if (!session?.user) {
      console.log('Assessment Questions API - No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phase = searchParams.get('phase');
    const path = searchParams.get('path');
    const adminView = searchParams.get('admin') === 'true';
    
    console.log('Assessment Questions API - Params:', { phase, path, adminView });

    await connectDB();

    let query: any = {};
    let questions;

    if (adminView) {
      // For admin panel, return all questions
      console.log('Assessment Questions API - Fetching all questions for admin');
      questions = await AssessmentQuestion.find({})
        .sort({ phase: 1, order: 1 })
        .select('-__v');
      console.log('Assessment Questions API - Found questions:', questions.length);
    } else {
      // For user assessment, filter by phase and active status
      const phaseNum = parseInt(phase || '1');
      query = { phase: phaseNum, isActive: true };
      
      if (phaseNum === 2 && path) {
        query.path = path;
      }

      questions = await AssessmentQuestion.find(query)
        .sort({ order: 1 })
        .select('-__v');
    }

    return NextResponse.json({ questions });

  } catch (error) {
    console.error('Error fetching assessment questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

// POST - Create new question (Admin only)
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      phase,
      path,
      questionText,
      questionImage,
      questionImages,
      requiresImageUpload,
      timeLimitMinutes,
      skillCategories,
      awardsCategories,
      order
    } = body;

    await connectDB();

    const question = new AssessmentQuestion({
      phase,
      path: phase === 2 ? path : undefined,
      questionText,
      questionImage: questionImage || null,
      questionImages: questionImages || [],
      requiresImageUpload: requiresImageUpload || false,
      timeLimitMinutes: timeLimitMinutes || null,
      skillCategories: skillCategories || {},
      awardsCategories: awardsCategories || {
        selfLearning: false,
        creative: false,
        algorithm: false,
        logic: false,
        communication: false,
        presentation: false,
        leadership: false,
        careerKnowledge: false
      },
      order: order || 0
    });

    await question.save();

    return NextResponse.json({ 
      message: 'Question created successfully',
      question: question.toObject()
    });

  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json(
      { error: 'Failed to create question' },
      { status: 500 }
    );
  }
}

// PUT - Update question (Admin only)
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
    }

    await connectDB();

    const question = await AssessmentQuestion.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Question updated successfully',
      question: question.toObject()
    });

  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json(
      { error: 'Failed to update question' },
      { status: 500 }
    );
  }
}

// DELETE - Delete question (Admin only)
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
    }

    await connectDB();

    const question = await AssessmentQuestion.findByIdAndDelete(id);

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Question deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    );
  }
}