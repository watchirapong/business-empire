const mongoose = require('mongoose');

const todoListSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
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
todoListSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for task count
todoListSchema.virtual('taskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'todoListId',
  count: true
});

// Index for better query performance
todoListSchema.index({ projectId: 1, position: 1 });

module.exports = mongoose.model('TodoList', todoListSchema);
