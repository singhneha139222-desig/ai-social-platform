const mongoose = require('mongoose');

const moderationLogSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
    },
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    contentType: {
      type: String,
      enum: ['post', 'comment'],
      required: true,
    },
    model: {
      type: String,
      default: '',
    },
    toxicityScore: {
      type: Number,
      min: 0,
      max: 1,
    },
    toxicityCategories: {
      type: Map,
      of: Number,
      default: {},
    },
    decision: {
      type: String,
      enum: ['publish', 'flag', 'reject'],
      required: true,
    },
    moderationStatus: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      default: '',
    },
    // Admin action fields
    adminAction: {
      type: String,
      enum: ['approve', 'reject', null],
      default: null,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    adminReason: {
      type: String,
      default: '',
    },
    source: {
      type: String,
      enum: ['ai_auto', 'admin_manual'],
      default: 'ai_auto',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
moderationLogSchema.index({ post: 1 });
moderationLogSchema.index({ comment: 1 });
moderationLogSchema.index({ decision: 1, createdAt: -1 });
moderationLogSchema.index({ adminAction: 1 });
moderationLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ModerationLog', moderationLogSchema);
