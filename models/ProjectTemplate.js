const mongoose = require('mongoose');

const projectTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  category: {
    type: String,
    enum: ['work', 'personal', 'team', 'development', 'marketing', 'sales', 'other'],
    default: 'other'
  },
  color: {
    type: String,
    default: '#3498db'
  },
  todoLists: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    tasks: [{
      title: {
        type: String,
        required: true
      },
      description: String,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      },
      estimatedDuration: Number // in minutes
    }]
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: String,
    required: true
  },
  usageCount: {
    type: Number,
    default: 0
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

// Index for better query performance
projectTemplateSchema.index({ category: 1, isPublic: 1 });
projectTemplateSchema.index({ usageCount: -1 });

module.exports = mongoose.model('ProjectTemplate', projectTemplateSchema);
