const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    default: '#3498db'
  },
  icon: {
    type: String,
    default: '📁'
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  ownerId: {
    type: String,
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: false
  },
  members: [{
    userId: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member'
    },
    joinedAt: {
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
projectSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Add owner as a member when creating project
projectSchema.pre('save', function(next) {
  if (this.isNew && this.ownerId) {
    // Check if owner is already in members
    const ownerExists = this.members.some(member => member.userId === this.ownerId);
    if (!ownerExists) {
      this.members.push({
        userId: this.ownerId,
        role: 'owner',
        joinedAt: new Date()
      });
    }
  }
  next();
});

// Virtual for task count
projectSchema.virtual('taskCount', {
  ref: 'ProjectTask',
  localField: '_id',
  foreignField: 'projectId',
  count: true
});

// Virtual for completed task count
projectSchema.virtual('completedTaskCount', {
  ref: 'ProjectTask',
  localField: '_id',
  foreignField: 'projectId',
  count: true,
  match: { status: 'completed' }
});

module.exports = mongoose.models.Project || mongoose.model('Project', projectSchema);
