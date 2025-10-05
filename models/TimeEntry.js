const mongoose = require('mongoose');

const timeEntrySchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  description: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for better query performance
timeEntrySchema.index({ taskId: 1, userId: 1 });
timeEntrySchema.index({ createdAt: -1 });

module.exports = mongoose.model('TimeEntry', timeEntrySchema);
