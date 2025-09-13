import mongoose, { Document, Schema } from 'mongoose';

export interface IAssessmentQuestion extends Document {
  id: string;
  phase: 1 | 2;
  path?: 'health' | 'creative' | 'gamedev' | 'engineering' | 'business';
  questionText: string;
  questionImage?: string; // Keep for backward compatibility
  questionImages?: string[]; // New field for multiple images
  requiresImageUpload: boolean;
  skillCategories: {
    selfLearning?: number;
    creative?: number;
    algorithm?: number;
    logic?: number;
    communication?: number;
    presentation?: number;
    leadership?: number;
    careerKnowledge?: number;
  };
  awardsCategories: {
    selfLearning: boolean;
    creative: boolean;
    algorithm: boolean;
    logic: boolean;
    communication: boolean;
    presentation: boolean;
    leadership: boolean;
    careerKnowledge: boolean;
  };
  order: number;
  isActive: boolean;
  timeLimitMinutes?: number; // Time limit in minutes (optional)
  createdAt: Date;
  updatedAt: Date;
}

const AssessmentQuestionSchema = new Schema<IAssessmentQuestion>({
  phase: {
    type: Number,
    required: true,
    enum: [1, 2]
  },
  path: {
    type: String,
    enum: ['health', 'creative', 'gamedev', 'engineering', 'business'],
    required: function() {
      return this.phase === 2;
    }
  },
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  questionImage: {
    type: String,
    default: null
  },
  questionImages: [{
    type: String,
    default: []
  }],
  requiresImageUpload: {
    type: Boolean,
    default: false
  },
  skillCategories: {
    selfLearning: { type: Number, default: 0, min: 0, max: 100 },
    creative: { type: Number, default: 0, min: 0, max: 100 },
    algorithm: { type: Number, default: 0, min: 0, max: 100 },
    logic: { type: Number, default: 0, min: 0, max: 100 },
    communication: { type: Number, default: 0, min: 0, max: 100 },
    presentation: { type: Number, default: 0, min: 0, max: 100 },
    leadership: { type: Number, default: 0, min: 0, max: 100 },
    careerKnowledge: { type: Number, default: 0, min: 0, max: 100 }
  },
  awardsCategories: {
    selfLearning: { type: Boolean, default: false },
    creative: { type: Boolean, default: false },
    algorithm: { type: Boolean, default: false },
    logic: { type: Boolean, default: false },
    communication: { type: Boolean, default: false },
    presentation: { type: Boolean, default: false },
    leadership: { type: Boolean, default: false },
    careerKnowledge: { type: Boolean, default: false }
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  timeLimitMinutes: {
    type: Number,
    default: null,
    min: 1,
    max: 120 // Maximum 2 hours
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
AssessmentQuestionSchema.index({ phase: 1, path: 1, order: 1 });
AssessmentQuestionSchema.index({ phase: 1, isActive: 1 });

export default mongoose.models.AssessmentQuestion || mongoose.model<IAssessmentQuestion>('AssessmentQuestion', AssessmentQuestionSchema);
