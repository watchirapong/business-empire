import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';
import mongoose from 'mongoose';
import UserAnswer from '@/models/UserAnswer';
import UserProgress from '@/models/UserProgress';
import AssessmentQuestion from '@/models/AssessmentQuestion';

// GET - Fetch user's answers
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const questionId = searchParams.get('questionId');
    const admin = searchParams.get('admin') === 'true';

    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    }

    // Check if user is admin for admin-only features
    const userIsAdmin = isAdmin((session.user as any).id);
    
    const query: any = {};
    
    // If admin parameter is true and user is admin, get all answers
    if (admin && userIsAdmin) {
      // Get all answers for admin view
      if (questionId) {
        query.questionId = questionId;
      }
    } else {
      // Regular user - only get their own answers
      query.userId = userId || (session.user as any).id;
      if (questionId) {
        query.questionId = questionId;
      }
    }

    const answers = await UserAnswer.find(query)
      .sort({ submittedAt: -1 })
      .select('-__v');

    // Fetch question data for each answer
    const answersWithQuestions = await Promise.all(
      answers.map(async (answer) => {
        const question = await AssessmentQuestion.findById(answer.questionId)
          .select('questionText questionImage questionImages phase path');
        
        // Debug logging
        console.log(`Answer ${answer._id} -> Question ${answer.questionId}:`, {
          questionText: question?.questionText,
          questionImage: question?.questionImage,
          questionImages: question?.questionImages,
          questionImagesLength: question?.questionImages?.length || 0
        });
        
        return {
          ...answer.toObject(),
          questionText: question?.questionText || 'Question not found',
          questionImage: question?.questionImage || null,
          questionImages: question?.questionImages || [],
          questionPhase: question?.phase || null,
          questionPath: question?.path || null,
          timeSpentSeconds: answer.timeSpentSeconds || null,
          timeStartedAt: answer.timeStartedAt || null
        };
      })
    );

    return NextResponse.json({ answers: answersWithQuestions });

  } catch (error) {
    console.error('Error fetching answers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch answers' },
      { status: 500 }
    );
  }
}

// POST - Submit answer
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const questionId = formData.get('questionId') as string;
    const answerText = formData.get('answerText') as string;
    const answerImage = formData.get('answerImage') as File | null;
    const timeSpentSeconds = formData.get('timeSpentSeconds') as string;
    const timeStartedAt = formData.get('timeStartedAt') as string;

    console.log('Received form data:');
    console.log('questionId:', questionId);
    console.log('answerText:', answerText);
    console.log('answerImage:', answerImage ? 'File present' : 'No file');
    console.log('timeSpentSeconds:', timeSpentSeconds);
    console.log('timeStartedAt:', timeStartedAt);

    if (!questionId || !answerText) {
      return NextResponse.json({ 
        error: 'Question ID and answer text are required' 
      }, { status: 400 });
    }

    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    }

    // Check if question exists and get its details
    const question = await AssessmentQuestion.findById(questionId);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Check if user already answered this question
    const existingAnswer = await UserAnswer.findOne({
      userId: (session.user as any).id,
      questionId
    });

    if (existingAnswer) {
      return NextResponse.json({ 
        error: 'You have already answered this question' 
      }, { status: 400 });
    }

    // Handle image upload if provided
    let imageUrl = null;
    if (answerImage && answerImage.size > 0) {
      // For now, we'll store the image data directly
      // In production, you might want to upload to a cloud service
      const buffer = await answerImage.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      imageUrl = `data:${answerImage.type};base64,${base64}`;
    }

    // Create new answer
    const answer = new UserAnswer({
      userId: (session.user as any).id,
      questionId,
      answerText,
      answerImage: imageUrl,
      timeSpentSeconds: timeSpentSeconds ? parseInt(timeSpentSeconds) : null,
      timeStartedAt: timeStartedAt ? new Date(timeStartedAt) : null
    });

    await answer.save();
    console.log('✅ Answer saved successfully:', answer._id);

    // Update user progress
    try {
      await updateUserProgress((session.user as any).id, questionId, question.phase);
      console.log('✅ User progress updated successfully');
    } catch (progressError) {
      console.error('❌ Error updating user progress:', progressError);
      // Don't fail the request if progress update fails
    }

    console.log('✅ Returning success response');
    return NextResponse.json({ 
      message: 'Answer submitted successfully',
      answer: {
        id: answer._id,
        questionId: answer.questionId,
        answerText: answer.answerText,
        answerImage: answer.answerImage,
        submittedAt: answer.submittedAt,
        isReviewed: answer.isReviewed
      }
    });

  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json(
      { error: 'Failed to submit answer' },
      { status: 500 }
    );
  }
}

// PUT - Update answer (Admin only - for scoring)
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
    const { answerId, adminScore, adminFeedback, skillScores } = body;

    if (!answerId) {
      return NextResponse.json({ error: 'Answer ID is required' }, { status: 400 });
    }

    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    }

    const answer = await UserAnswer.findByIdAndUpdate(
      answerId,
      {
        adminScore,
        adminFeedback,
        skillScores,
        status: 'approved',
        isReviewed: true,
        reviewedAt: new Date(),
        reviewedBy: userId
      },
      { new: true, runValidators: true }
    );

    if (!answer) {
      return NextResponse.json({ error: 'Answer not found' }, { status: 404 });
    }

    // Update user's total score
    await updateUserTotalScore(answer.userId);

    return NextResponse.json({ 
      message: 'Answer scored successfully',
      answer: {
        id: answer._id,
        adminScore: answer.adminScore,
        adminFeedback: answer.adminFeedback,
        skillScores: answer.skillScores,
        isReviewed: answer.isReviewed,
        reviewedAt: answer.reviewedAt
      }
    });

  } catch (error) {
    console.error('Error updating answer:', error);
    return NextResponse.json(
      { error: 'Failed to update answer' },
      { status: 500 }
    );
  }
}

// Helper function to update user progress
async function updateUserProgress(userId: string, questionId: string, phase: number) {
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

  if (phase === 1) {
    if (!progress.phase1Answers.includes(questionId)) {
      progress.phase1Answers.push(questionId);
    }
    
    // Check if Phase 1 is now complete
    const phase1Questions = await AssessmentQuestion.find({ 
      phase: 1, 
      isActive: true 
    });
    progress.phase1Completed = progress.phase1Answers.length >= phase1Questions.length;
    
  } else if (phase === 2) {
    if (!progress.phase2Answers.includes(questionId)) {
      progress.phase2Answers.push(questionId);
    }
    
    // Check if Phase 2 is now complete
    if (progress.selectedPath) {
      const phase2Questions = await AssessmentQuestion.find({ 
        phase: 2, 
        path: progress.selectedPath,
        isActive: true 
      });
      progress.phase2Completed = progress.phase2Answers.length >= phase2Questions.length;
    }
  }

  await progress.save();
  console.log(`[updateUserProgress] User ${userId} - Phase ${phase} - Phase1Completed: ${progress.phase1Completed}, Phase2Completed: ${progress.phase2Completed}`);
}

// Helper function to update user's total score
async function updateUserTotalScore(userId: string) {
  const answers = await UserAnswer.find({ 
    userId, 
    isReviewed: true,
    skillScores: { $exists: true }
  });

  const progress = await UserProgress.findOne({ userId });
  if (!progress) return;

  // Reset scores
  progress.totalScore = {
    selfLearning: 0,
    creative: 0,
    algorithm: 0,
    logic: 0,
    communication: 0,
    presentation: 0,
    leadership: 0,
    careerKnowledge: 0
  };

  // Calculate total scores from skillScores
  for (const answer of answers) {
    if (answer.skillScores) {
      const scores = answer.skillScores;
      
      if (scores.selfLearning) progress.totalScore.selfLearning += scores.selfLearning;
      if (scores.creative) progress.totalScore.creative += scores.creative;
      if (scores.algorithm) progress.totalScore.algorithm += scores.algorithm;
      if (scores.logic) progress.totalScore.logic += scores.logic;
      if (scores.communication) progress.totalScore.communication += scores.communication;
      if (scores.presentation) progress.totalScore.presentation += scores.presentation;
      if (scores.leadership) progress.totalScore.leadership += scores.leadership;
      if (scores.careerKnowledge) progress.totalScore.careerKnowledge += scores.careerKnowledge;
    }
  }

  await progress.save();
}

// PATCH - Decline submission (Admin only)
export async function PATCH(request: NextRequest) {
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
    const { answerId, status, adminFeedback } = body;

    if (!answerId || !status) {
      return NextResponse.json({ error: 'Answer ID and status are required' }, { status: 400 });
    }

    if (!['approved', 'declined'].includes(status)) {
      return NextResponse.json({ error: 'Status must be either "approved" or "declined"' }, { status: 400 });
    }

    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    }

    const answer = await UserAnswer.findByIdAndUpdate(
      answerId,
      {
        status,
        isReviewed: true,
        reviewedAt: new Date(),
        reviewedBy: userId,
        adminFeedback: adminFeedback || null
      },
      { new: true, runValidators: true }
    );

    if (!answer) {
      return NextResponse.json({ error: 'Answer not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: `Submission ${status} successfully`,
      answer: {
        id: answer._id,
        status: answer.status,
        isReviewed: answer.isReviewed,
        adminFeedback: answer.adminFeedback,
        reviewedAt: answer.reviewedAt
      }
    });

  } catch (error) {
    console.error('Error updating submission status:', error);
    return NextResponse.json(
      { error: 'Failed to update submission status' },
      { status: 500 }
    );
  }
}
