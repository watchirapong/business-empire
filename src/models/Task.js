import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  taskName: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  description: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 1000
  },
  image: { 
    type: String, 
    required: true,
    trim: true
  },
  reward: { 
    type: Number, 
    required: true,
    min: 0
  },
  postedBy: { 
    id: { 
      type: String, 
      required: true,
      index: true
    },
    username: { 
      type: String, 
      required: true 
    }
  },
  status: { 
    type: String, 
    required: true,
    enum: ['open', 'accepted', 'completed'],
    default: 'open',
    index: true
  },
  acceptedBy: { 
    id: { 
      type: String,
      index: true
    },
    username: { 
      type: String 
    }
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  acceptedAt: { 
    type: Date 
  },
  completedAt: { 
    type: Date 
  }
});

// Indexes for better performance
taskSchema.index({ status: 1, createdAt: -1 });
taskSchema.index({ 'postedBy.id': 1, createdAt: -1 });
taskSchema.index({ 'acceptedBy.id': 1, createdAt: -1 });

export default mongoose.model('Task', taskSchema);
