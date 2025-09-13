import mongoose, { Document, Schema } from 'mongoose';

export interface ILobbyRoom extends Document {
  roomId: string;
  roomName: string;
  description?: string;
  hostId: string;
  hostName: string;
  maxParticipants: number;
  participants: Array<{
    userId: string;
    username: string;
    joinedAt: Date;
    isReady: boolean;
  }>;
  gameType: 'assessment' | 'quiz' | 'general';
  status: 'waiting' | 'starting' | 'active' | 'finished';
  settings: {
    isPrivate: boolean;
    allowSpectators: boolean;
    autoStart: boolean;
    timeLimit?: number; // in seconds
  };
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}

const LobbyRoomSchema = new Schema<ILobbyRoom>({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  roomName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  hostId: {
    type: String,
    required: true
  },
  hostName: {
    type: String,
    required: true
  },
  maxParticipants: {
    type: Number,
    default: 10,
    min: 2,
    max: 50
  },
  participants: [{
    userId: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isReady: {
      type: Boolean,
      default: false
    }
  }],
  gameType: {
    type: String,
    enum: ['assessment', 'quiz', 'general'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['waiting', 'starting', 'active', 'finished'],
    default: 'waiting'
  },
  settings: {
    isPrivate: {
      type: Boolean,
      default: false
    },
    allowSpectators: {
      type: Boolean,
      default: true
    },
    autoStart: {
      type: Boolean,
      default: false
    },
    timeLimit: {
      type: Number,
      min: 30,
      max: 3600
    }
  },
  startedAt: Date,
  endedAt: Date
}, {
  timestamps: true
});

// Indexes for better performance
LobbyRoomSchema.index({ roomId: 1 });
LobbyRoomSchema.index({ hostId: 1 });
LobbyRoomSchema.index({ status: 1 });
LobbyRoomSchema.index({ gameType: 1 });
LobbyRoomSchema.index({ createdAt: -1 });

export default mongoose.models.LobbyRoom || mongoose.model<ILobbyRoom>('LobbyRoom', LobbyRoomSchema);
