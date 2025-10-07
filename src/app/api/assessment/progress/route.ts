import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import UserProgress from '@/models/UserProgress';
import AssessmentQuestion from '@/models/AssessmentQuestion';
import SystemSettings from '@/models/SystemSettings';
import UserAnswer from '@/models/UserAnswer';

// GET - Fetch user progress
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || (session.user as any).id;

    await connectDB();

    let progress = await UserProgress.findOne({ userId });
    
    if (!progress) {
      // Create initial progress record
      progress = new UserProgress({
        userId,
        phase1Answers: [],
        phase2Answers: [],
        totalScore: {
          selfLearning: 0,
          creative: 0,
          algorithm: 0,
          logic: 0,
          communication: 0,
          presentation: 0,
          leadership: 0,
          careerKnowledge: 0
        }
      });
      await progress.save();
    }

    // Get system settings
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = new SystemSettings();
      await settings.save();
    }

    // Check if Phase 1 is complete
    const phase1Questions = await AssessmentQuestion.find({ 
      phase: 1, 
      isActive: true 
    });
    const phase1Completed = progress.phase1Answers.length >= phase1Questions.length;

    // Check if Phase 2 is complete (if path is selected)
    let phase2Completed = false;
    if (progress.selectedPath) {
      const phase2Questions = await AssessmentQuestion.find({ 
        phase: 2, 
        path: progress.selectedPath,
        isActive: true 
      });
      phase2Completed = progress.phase2Answers.length >= phase2Questions.length;
    }

    return NextResponse.json({
      progress: progress.toObject(),
      settings: settings.toObject(),
      phase1Completed,
      phase2Completed,
      phase1TotalQuestions: phase1Questions.length,
      phase2TotalQuestions: progress.selectedPath ? 
        await AssessmentQuestion.countDocuments({ 
          phase: 2, 
          path: progress.selectedPath,
          isActive: true 
        }) : 0
    });

  } catch (error) {
    console.error('Error fetching user progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

// POST - Update user progress
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      selectedPath, 
      phase1Answers, 
      phase2Answers, 
      totalScore 
    } = body;

    const userId = (session.user as any).id;

    await connectDB();

    // Find or create progress record
    let progress = await UserProgress.findOne({ userId });
    
    if (!progress) {
      progress = new UserProgress({
        userId,
        phase1Answers: [],
        phase2Answers: [],
        totalScore: {
          selfLearning: 0,
          creative: 0,
          algorithm: 0,
          logic: 0,
          communication: 0,
          presentation: 0,
          leadership: 0,
          careerKnowledge: 0
        }
      });
    }

    // Update progress
    if (selectedPath !== undefined) {
      progress.selectedPath = selectedPath;
    }
    if (phase1Answers !== undefined) {
      progress.phase1Answers = phase1Answers;
    }
    if (phase2Answers !== undefined) {
      progress.phase2Answers = phase2Answers;
    }
    if (totalScore !== undefined) {
      progress.totalScore = totalScore;
    }

    progress.updatedAt = new Date();
    await progress.save();

    return NextResponse.json({
      message: 'Progress updated successfully',
      progress: progress.toObject()
    });

  } catch (error) {
    console.error('Error updating user progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}