const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      minlength: 1,
      maxlength: 1000,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    // --- Moderation (same pipeline as posts) ---
    toxicityScore: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    moderationStatus: {
      type: String,
      enum: ['pending', 'published', 'flagged', 'rejected', 'removed', 'approved_by_admin', 'rejected_by_admin'],
      default: 'pending',
    },
    moderationReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
commentSchema.index({ post: 1, createdAt: 1 });
commentSchema.index({ author: 1 });
commentSchema.index({ moderationStatus: 1 });
commentSchema.index({ parentComment: 1 });

module.exports = mongoose.model('Comment', commentSchema);
