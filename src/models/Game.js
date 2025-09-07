import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxLength: 1000
  },
  itchIoUrl: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/[a-zA-Z0-9\-]+\.itch\.io\/[a-zA-Z0-9\-]+$/.test(v);
      },
      message: 'Invalid itch.io URL format'
    }
  },
  thumbnailUrl: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  genre: {
    type: String,
    trim: true
  },
  author: {
    userId: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true
    },
    nickname: {
      type: String
    },
    avatar: {
      type: String
    }
  },
  likes: [{
    userId: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId()
    },
    userId: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true
    },
    avatar: {
      type: String
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxLength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  roomId: {
    type: String,
    default: null
  },
  color: {
    type: String,
    default: '#8B5CF6', // Default purple color
    validate: {
      validator: function(v) {
        return /^#[0-9A-Fa-f]{6}$/.test(v); // Validate hex color
      },
      message: 'Invalid hex color format'
    }
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

// Indexes for performance
gameSchema.index({ 'author.userId': 1 });
gameSchema.index({ createdAt: -1 });
gameSchema.index({ tags: 1 });
gameSchema.index({ genre: 1 });
gameSchema.index({ 'likes.userId': 1 });

const Game = mongoose.models.Game || mongoose.model('Game', gameSchema);

export default Game;
