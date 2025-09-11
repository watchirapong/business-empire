import mongoose, { Document, Schema } from 'mongoose';

export interface IUserProgress extends Document {
  id: string;
  userId: string;
  phase1Completed: boolean;
  phase2Completed: boolean;
  selectedPath?: 'health' | 'creative' | 'gamedev' | 'engineering' | 'business';
  phase1Answers: string[]; // Array of question IDs answered in Phase 1
  phase2Answers: string[]; // Array of question IDs answered in Phase 2
  totalScore: {
    selfLearning: number;
    creative: number;
    algorithm: number;
    logic: number;
    communication: number;
    presentation: number;
    leadership: number;
    careerKnowledge: number;
  };
  isApproved: boolean;
  approvedAt?: Date;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserProgressSchema = new Schema<IUserProgress>({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  phase1Completed: {
    type: Boolean,
    default: false
  },
  phase2Completed: {
    type: Boolean,
    default: false
  },
  selectedPath: {
    type: String,
    enum: ['health', 'creative', 'gamedev', 'engineering', 'business'],
    default: null
  },
  phase1Answers: [{
    type: String,
    ref: 'AssessmentQuestion'
  }],
  phase2Answers: [{
    type: String,
    ref: 'AssessmentQuestion'
  }],
  totalScore: {
    selfLearning: { type: Number, default: 0, min: 0 },
    creative: { type: Number, default: 0, min: 0 },
    algorithm: { type: Number, default: 0, min: 0 },
    logic: { type: Number, default: 0, min: 0 },
    communication: { type: Number, default: 0, min: 0 },
    presentation: { type: Number, default: 0, min: 0 },
    leadership: { type: Number, default: 0, min: 0 },
    careerKnowledge: { type: Number, default: 0, min: 0 }
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedAt: {
    type: Date,
    default: null
  },
  approvedBy: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Create indexes for efficient queries
UserProgressSchema.index({ userId: 1 });
UserProgressSchema.index({ phase1Completed: 1, phase2Completed: 1 });
UserProgressSchema.index({ isApproved: 1, approvedAt: -1 });
UserProgressSchema.index({ selectedPath: 1 });

export default mongoose.models.UserProgress || mongoose.model<IUserProgress>('UserProgress', UserProgressSchema);
