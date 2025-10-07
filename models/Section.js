const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
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
  position: {
    type: Number,
    default: 0
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  createdById: {
    type: String,
    required: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
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
sectionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for task count
sectionSchema.virtual('taskCount', {
  ref: 'ProjectTask',
  localField: '_id',
  foreignField: 'sectionId',
  count: true
});

// Virtual for completed task count
sectionSchema.virtual('completedTaskCount', {
  ref: 'ProjectTask',
  localField: '_id',
  foreignField: 'sectionId',
  count: true,
  match: { status: 'completed' }
});

// Index for better query performance
sectionSchema.index({ projectId: 1, position: 1 });
sectionSchema.index({ createdById: 1 });

module.exports = mongoose.models.Section || mongoose.model('Section', sectionSchema);
