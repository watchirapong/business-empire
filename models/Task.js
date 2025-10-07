const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['P1', 'P2', 'P3', 'P4', 'low', 'medium', 'high', 'urgent'],
    default: 'P4'
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'],
    default: 'not_started'
  },
  dueDate: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  position: {
    type: Number,
    default: 0
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },
  todoListId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TodoList'
  },
  assignedToId: {
    type: String
  },
  labels: [{
    name: {
      type: String,
      required: true
    },
    color: {
      type: String,
      default: '#3498db'
    }
  }],
  isCompleted: {
    type: Boolean,
    default: false
  },
  createdById: {
    type: String,
    required: true
  },
  comments: [{
    content: {
      type: String,
      required: true
    },
    userId: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  attachments: [{
    fileName: {
      type: String,
      required: true
    },
    filePath: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    uploadedById: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
taskSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Set completedAt when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  } else if (this.isModified('status') && this.status !== 'completed') {
    this.completedAt = undefined;
  }
  
  next();
});

// Index for better query performance
taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ assignedToId: 1 });
taskSchema.index({ createdById: 1 });

module.exports = mongoose.models.ProjectTask || mongoose.model('ProjectTask', taskSchema);
