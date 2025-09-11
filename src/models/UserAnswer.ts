import mongoose, { Document, Schema } from 'mongoose';

export interface IUserAnswer extends Document {
  id: string;
  userId: string;
  questionId: string;
  answerText: string;
  answerImage?: string;
  submittedAt: Date;
  timeSpentSeconds?: number; // Time spent on this question in seconds
  timeStartedAt?: Date; // When user started answering this question
  isReviewed: boolean;
  status: 'pending' | 'approved' | 'declined';
  adminScore?: number;
  adminFeedback?: string;
  reviewedAt?: Date;
  reviewedBy?: string;
  skillScores?: {
    selfLearning?: number;
    creative?: number;
    algorithm?: number;
    logic?: number;
    communication?: number;
    presentation?: number;
    leadership?: number;
    careerKnowledge?: number;
  };
}

const UserAnswerSchema = new Schema<IUserAnswer>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  questionId: {
    type: String,
    required: true,
    index: true
  },
  answerText: {
    type: String,
    required: true,
    trim: true
  },
  answerImage: {
    type: String,
    default: null
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  timeSpentSeconds: {
    type: Number,
    default: null,
    min: 0
  },
  timeStartedAt: {
    type: Date,
    default: null
  },
  isReviewed: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'declined'],
    default: 'pending'
  },
  adminScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  adminFeedback: {
    type: String,
    default: null,
    trim: true
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewedBy: {
    type: String,
    default: null
  },
  skillScores: {
    selfLearning: {
      type: Number,
      default: null
    },
    creative: {
      type: Number,
      default: null
    },
    algorithm: {
      type: Number,
      default: null
    },
    logic: {
      type: Number,
      default: null
    },
    communication: {
      type: Number,
      default: null
    },
    presentation: {
      type: Number,
      default: null
    },
    leadership: {
      type: Number,
      default: null
    },
    careerKnowledge: {
      type: Number,
      default: null
    }
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
UserAnswerSchema.index({ userId: 1, questionId: 1 }, { unique: true });
UserAnswerSchema.index({ userId: 1, submittedAt: -1 });
UserAnswerSchema.index({ isReviewed: 1, submittedAt: -1 });

export default mongoose.models.UserAnswer || mongoose.model<IUserAnswer>('UserAnswer', UserAnswerSchema);
