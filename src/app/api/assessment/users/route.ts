import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import UserProgress from '@/models/UserProgress';
import UserAnswer from '@/models/UserAnswer';
import AssessmentQuestion from '@/models/AssessmentQuestion';

// GET - Fetch all users with assessment progress (Admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!isAdmin((session.user as any).id)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    // Get all user progress records
    const allProgress = await UserProgress.find({}).sort({ updatedAt: -1 });
    
    // Get all user answers
    const allAnswers = await UserAnswer.find({});
    
    // Get all questions for reference
    const allQuestions = await AssessmentQuestion.find({});
    const questionsMap = new Map();
    allQuestions.forEach(question => {
      questionsMap.set(question._id.toString(), question);
    });
    
    // Group answers by user and attach question details
    const answersByUser: { [userId: string]: any[] } = {};
    allAnswers.forEach(answer => {
      if (!answersByUser[answer.userId]) {
        answersByUser[answer.userId] = [];
      }
      
      // Attach question details to the answer
      const question = questionsMap.get(answer.questionId);
      const answerWithQuestion = {
        ...answer.toObject(),
        questionId: question || null
      };
      
      answersByUser[answer.userId].push(answerWithQuestion);
    });

    // Try to enhance user data with Discord nicknames
    let EnhancedUser: any;
    try {
      EnhancedUser = mongoose.model('EnhancedUser');
    } catch (error) {
      // Enhanced user model not available
    }

    // Format the response
    const users = await Promise.all(allProgress.map(async (progress) => {
      let displayName = `User${progress.userId.slice(-4)}`;
      let discordNickname = null;

      if (EnhancedUser) {
        try {
          const enhancedUser = await EnhancedUser.findOne({ discordId: progress.userId });
          if (enhancedUser) {
            displayName = enhancedUser.discordServerData?.nickname || 
                         enhancedUser.globalName || 
                         enhancedUser.username || 
                         displayName;
            discordNickname = enhancedUser.discordServerData?.nickname;
          }
        } catch (error) {
          console.error('Error fetching enhanced user data:', error);
        }
      }

      return {
        userId: progress.userId,
        displayName,
        discordNickname,
        selectedPath: progress.selectedPath,
        phase1Answers: progress.phase1Answers,
        phase2Answers: progress.phase2Answers,
        totalScore: progress.totalScore,
        answers: answersByUser[progress.userId] || [],
        createdAt: progress.createdAt,
        updatedAt: progress.updatedAt
      };
    }));

    return NextResponse.json({ users });

  } catch (error) {
    console.error('Error fetching assessment users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user assessment data (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!isAdmin((session.user as any).id)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await connectDB();

    // Delete user progress
    const deletedProgress = await UserProgress.deleteOne({ userId });
    
    // Delete user answers
    const deletedAnswers = await UserAnswer.deleteMany({ userId });

    return NextResponse.json({
      message: 'User assessment data deleted successfully',
      deletedAnswers: deletedAnswers.deletedCount,
      deletedProgress: deletedProgress.deletedCount
    });

  } catch (error) {
    console.error('Error deleting user assessment data:', error);
    return NextResponse.json(
      { error: 'Failed to delete user data' },
      { status: 500 }
    );
  }
}