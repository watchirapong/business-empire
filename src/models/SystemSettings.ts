import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemSettings extends Document {
  id: string;
  phase2Open: boolean;
  allowFriendAnswers: boolean;
  maxImageSize: number; // in MB
  allowedImageTypes: string[];
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>({
  phase2Open: {
    type: Boolean,
    default: false
  },
  allowFriendAnswers: {
    type: Boolean,
    default: true
  },
  maxImageSize: {
    type: Number,
    default: 5 // 5MB
  },
  allowedImageTypes: {
    type: [String],
    default: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
SystemSettingsSchema.index({}, { unique: true });

export default mongoose.models.SystemSettings || mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
