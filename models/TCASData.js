const mongoose = require('mongoose');

const roundSchema = new mongoose.Schema({
  quota: { type: Number, default: 0 },
  applicants: { type: Number, default: 0 },
  passed: { type: Number, default: 0 },
  confirmed: { type: Number, default: 0 },
  notUsed: { type: Number, default: 0 },
  waived: { type: Number, default: 0 }
}, { _id: false });

const tcasDataSchema = new mongoose.Schema({
  universityCode: { type: String, required: true, index: true },
  universityName: { type: String, required: true, index: true },
  programCode: { type: String, required: true },
  branchCode: { type: String, required: true },
  programName: { type: String, required: true, index: true },
  branchName: { type: String, required: false, index: true, default: '' },
  round1: roundSchema,
  round2: roundSchema,
  round3: roundSchema,
  round4: {
    applicants: { type: Number, default: 0 },
    passed: { type: Number, default: 0 },
    confirmed: { type: Number, default: 0 },
    notUsed: { type: Number, default: 0 },
    waived: { type: Number, default: 0 }
  },
  round42: roundSchema,
  totalConfirmed: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Compound index for efficient queries
tcasDataSchema.index({ universityCode: 1, programCode: 1, branchCode: 1 }, { unique: true });

// Text index for search functionality
tcasDataSchema.index({
  universityName: 'text',
  programName: 'text',
  branchName: 'text'
});

module.exports = mongoose.model('TCASData', tcasDataSchema);
