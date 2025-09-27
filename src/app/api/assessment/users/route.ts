import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';
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

    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    }

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

    // Format the response
    const users = allProgress.map(progress => {
      const userAnswers = answersByUser[progress.userId] || [];
      const pendingAnswers = userAnswers.filter(answer => answer.status === 'pending');
      const approvedAnswers = userAnswers.filter(answer => answer.status === 'approved');
      const declinedAnswers = userAnswers.filter(answer => answer.status === 'declined');

      return {
        id: progress._id,
        userId: progress.userId,
        phase1Completed: progress.phase1Completed || false,
        phase2Completed: progress.phase2Completed || false,
        selectedPath: progress.selectedPath || null,
        totalScore: progress.totalScore || {
          selfLearning: 0,
          creative: 0,
          algorithm: 0,
          logic: 0,
          communication: 0,
          presentation: 0,
          leadership: 0,
          careerKnowledge: 0
        },
        phase1Answers: progress.phase1Answers || [],
        phase2Answers: progress.phase2Answers || [],
        isApproved: progress.isApproved || false,
        approvedAt: progress.approvedAt || null,
        approvedBy: progress.approvedBy || null,
        createdAt: progress.createdAt,
        updatedAt: progress.updatedAt,
        // Answer statistics
        totalAnswers: userAnswers.length,
        pendingAnswers: pendingAnswers.length,
        approvedAnswers: approvedAnswers.length,
        declinedAnswers: declinedAnswers.length,
        // All answers with question details
        allAnswers: userAnswers.map(answer => ({
          id: answer._id,
          questionId: answer.questionId,
          questionText: answer.questionId?.questionText || 'Question not found',
          questionImage: answer.questionId?.questionImage || null,
          questionImages: answer.questionId?.questionImages || [],
          questionPhase: answer.questionId?.phase || 1,
          answerText: answer.answerText,
          answerImage: answer.answerImage,
          status: answer.status || 'pending',
          submittedAt: answer.submittedAt,
          timeStartedAt: answer.timeStartedAt || null,
          timeSpentSeconds: answer.timeSpentSeconds || null,
          skillScores: answer.skillScores || null,
          reviewedAt: answer.reviewedAt || null,
          reviewedBy: answer.reviewedBy || null
        })),
        // Recent answers (for summary)
        recentAnswers: userAnswers.slice(0, 3).map(answer => ({
          id: answer._id,
          questionId: answer.questionId,
          answerText: answer.answerText?.substring(0, 100) + (answer.answerText?.length > 100 ? '...' : ''),
          status: answer.status || 'pending',
          submittedAt: answer.submittedAt
        }))
      };
    });

    return NextResponse.json({
      users,
      total: users.length,
      summary: {
        totalUsers: users.length,
        usersWithAnswers: users.filter(u => u.totalAnswers > 0).length,
        pendingReviews: users.reduce((sum, u) => sum + u.pendingAnswers, 0),
        approvedAnswers: users.reduce((sum, u) => sum + u.approvedAnswers, 0),
        declinedAnswers: users.reduce((sum, u) => sum + u.declinedAnswers, 0)
      }
    });

  } catch (error) {
    console.error('Error fetching assessment users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessment users' },
      { status: 500 }
    );
  }
}

// DELETE - Delete all assessment data for a specific user (Admin only)
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

    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    }

    // Delete all user answers
    const deletedAnswers = await UserAnswer.deleteMany({ userId });
    console.log(`Deleted ${deletedAnswers.deletedCount} answers for user ${userId}`);

    // Delete user progress
    const deletedProgress = await UserProgress.deleteOne({ userId });
    console.log(`Deleted ${deletedProgress.deletedCount} progress records for user ${userId}`);

    return NextResponse.json({
      message: 'User assessment data deleted successfully',
      deletedAnswers: deletedAnswers.deletedCount,
      deletedProgress: deletedProgress.deletedCount
    });

  } catch (error) {
    console.error('Error deleting user assessment data:', error);
    return NextResponse.json(
      { error: 'Failed to delete user assessment data' },
      { status: 500 }
    );
  }
}
