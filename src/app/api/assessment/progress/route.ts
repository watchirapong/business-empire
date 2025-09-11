import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';
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

    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    }

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

    // Check for declined submissions
    const declinedAnswers = await UserAnswer.find({
      userId,
      status: 'declined'
    });

    const hasDeclinedSubmissions = declinedAnswers.length > 0;
    
    console.log(`[Progress API] User ${userId}:`);
    console.log(`- Phase1Completed: ${phase1Completed}`);
    console.log(`- Phase2Completed: ${phase2Completed}`);
    console.log(`- IsApproved: ${progress.isApproved}`);
    console.log(`- DeclinedAnswers count: ${declinedAnswers.length}`);
    console.log(`- HasDeclinedSubmissions: ${hasDeclinedSubmissions}`);

    // Update progress status
    progress.phase1Completed = phase1Completed;
    progress.phase2Completed = phase2Completed;
    await progress.save();

    return NextResponse.json({
      progress: {
        id: progress._id,
        userId: progress.userId,
        phase1Completed: progress.phase1Completed,
        phase2Completed: progress.phase2Completed,
        selectedPath: progress.selectedPath,
        phase1Answers: progress.phase1Answers,
        phase2Answers: progress.phase2Answers,
        totalScore: progress.totalScore,
        isApproved: progress.isApproved,
        approvedAt: progress.approvedAt,
        approvedBy: progress.approvedBy,
        hasDeclinedSubmissions
      },
      settings: {
        phase2Open: settings.phase2Open,
        allowFriendAnswers: settings.allowFriendAnswers
      },
      canProceedToPhase2: settings.phase2Open && phase1Completed,
      hasDeclinedSubmissions
    });

  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

// POST - Select career path
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { selectedPath } = body;

    if (!selectedPath) {
      return NextResponse.json({ error: 'Path selection is required' }, { status: 400 });
    }

    const validPaths = ['health', 'creative', 'gamedev', 'engineering', 'business'];
    if (!validPaths.includes(selectedPath)) {
      return NextResponse.json({ error: 'Invalid path selected' }, { status: 400 });
    }

    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    }

    const progress = await UserProgress.findOne({ userId: (session.user as any).id });
    
    if (!progress) {
      return NextResponse.json({ error: 'User progress not found' }, { status: 404 });
    }

    if (!progress.phase1Completed) {
      return NextResponse.json({ 
        error: 'Must complete Phase 1 before selecting a path' 
      }, { status: 400 });
    }

    // Get system settings
    const settings = await SystemSettings.findOne();
    if (!settings?.phase2Open) {
      return NextResponse.json({ 
        error: 'Phase 2 is not yet open' 
      }, { status: 400 });
    }

    progress.selectedPath = selectedPath;
    await progress.save();

    return NextResponse.json({ 
      message: 'Path selected successfully',
      progress: {
        id: progress._id,
        selectedPath: progress.selectedPath,
        phase1Completed: progress.phase1Completed,
        phase2Completed: progress.phase2Completed
      }
    });

  } catch (error) {
    console.error('Error selecting path:', error);
    return NextResponse.json(
      { error: 'Failed to select path' },
      { status: 500 }
    );
  }
}

// PUT - Approve user (Admin only) or Force Reset (User only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId: targetUserId, isApproved, forceReset, phase1Completed, phase2Completed } = body;

    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    }

    // Handle force reset (User only)
    if (forceReset) {
      const userId = (session.user as any).id;
      
      const progress = await UserProgress.findOneAndUpdate(
        { userId },
        {
          phase1Completed: phase1Completed || false,
          phase2Completed: phase2Completed || false,
          isApproved: false,
          approvedAt: null,
          approvedBy: null,
          phase1Answers: [],
          phase2Answers: []
        },
        { new: true, runValidators: true }
      );

      if (!progress) {
        return NextResponse.json({ error: 'User progress not found' }, { status: 404 });
      }

      // Also delete any declined answers
      await UserAnswer.deleteMany({
        userId,
        status: 'declined'
      });

      console.log(`[Force Reset] User ${userId} progress reset successfully`);

      return NextResponse.json({ 
        message: 'Progress reset successfully',
        progress: {
          id: progress._id,
          userId: progress.userId,
          phase1Completed: progress.phase1Completed,
          phase2Completed: progress.phase2Completed,
          isApproved: progress.isApproved
        }
      });
    }

    // Handle admin approval (Admin only)
    const userId = (session.user as any).id;
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const progress = await UserProgress.findOneAndUpdate(
      { userId: targetUserId },
      {
        isApproved,
        approvedAt: isApproved ? new Date() : null,
        approvedBy: isApproved ? userId : null
      },
      { new: true, runValidators: true }
    );

    if (!progress) {
      return NextResponse.json({ error: 'User progress not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: `User ${isApproved ? 'approved' : 'disapproved'} successfully`,
      progress: {
        id: progress._id,
        userId: progress.userId,
        isApproved: progress.isApproved,
        approvedAt: progress.approvedAt,
        approvedBy: progress.approvedBy
      }
    });

  } catch (error) {
    console.error('Error updating approval:', error);
    return NextResponse.json(
      { error: 'Failed to update approval' },
      { status: 500 }
    );
  }
}

// DELETE - Reset declined progress (User only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    }

    // Find declined answers
    const declinedAnswers = await UserAnswer.find({
      userId,
      status: 'declined'
    });

    console.log(`[Reset API] User ${userId}: Found ${declinedAnswers.length} declined answers`);

    if (declinedAnswers.length === 0) {
      // Even if no declined submissions, still reset the user's progress
      const progress = await UserProgress.findOne({ userId });
      if (progress) {
        progress.phase1Completed = false;
        progress.phase2Completed = false;
        progress.isApproved = false;
        progress.approvedAt = null;
        progress.approvedBy = null;
        progress.phase1Answers = [];
        progress.phase2Answers = [];
        
        await progress.save();
        
        console.log(`[Reset API] User ${userId}: No declined submissions, but reset progress anyway`);
        
        return NextResponse.json({ 
          message: 'No declined submissions found, but progress reset successfully',
          resetCount: 0
        });
      }
      
      return NextResponse.json({ 
        message: 'No declined submissions found and no progress to reset' 
      });
    }

    // Remove declined answers from user progress
    const progress = await UserProgress.findOne({ userId });
    if (progress) {
      // Remove declined question IDs from phase answers
      const declinedQuestionIds = declinedAnswers.map(answer => answer.questionId);
      
      progress.phase1Answers = progress.phase1Answers.filter(
        (answerId: string) => !declinedQuestionIds.includes(answerId)
      );
      progress.phase2Answers = progress.phase2Answers.filter(
        (answerId: string) => !declinedQuestionIds.includes(answerId)
      );
      
      // Reset completion status
      progress.phase1Completed = false;
      progress.phase2Completed = false;
      progress.isApproved = false;
      progress.approvedAt = null;
      progress.approvedBy = null;
      
      await progress.save();
    }

    // Delete declined answers
    await UserAnswer.deleteMany({
      userId,
      status: 'declined'
    });

    return NextResponse.json({ 
      message: 'Declined progress reset successfully',
      resetCount: declinedAnswers.length
    });

  } catch (error) {
    console.error('Error resetting declined progress:', error);
    return NextResponse.json(
      { error: 'Failed to reset declined progress' },
      { status: 500 }
    );
  }
}
