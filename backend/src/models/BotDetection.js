const mongoose = require('mongoose');

const botDetectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  botProbability: {
    type: Number,
    default: null
  },
  riskLevel: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical', 'insufficient_data', null],
    default: null
  },
  featuresUsed: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  modelVersion: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  errorCode: {
    type: String,
    default: null
  },
  evaluationDurationMs: {
    type: Number,
    default: null
  },
  evaluatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

botDetectionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('BotDetection', botDetectionSchema);
