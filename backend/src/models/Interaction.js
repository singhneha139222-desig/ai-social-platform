const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // For like/comment/view: references a Post
    // For follow: references a User (stored as targetUser)
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: ['like', 'comment', 'follow', 'view', 'follow_request'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
interactionSchema.index({ user: 1, type: 1 });
interactionSchema.index({ post: 1, type: 1 });
// Unique per user+post+type only when post exists (likes, comments, views)
interactionSchema.index(
  { user: 1, post: 1, type: 1 },
  { unique: true, partialFilterExpression: { post: { $type: 'objectId' } } }
);
// Unique per user+targetUser+type only when targetUser exists (follows)
interactionSchema.index(
  { user: 1, targetUser: 1, type: 1 },
  { unique: true, partialFilterExpression: { targetUser: { $type: 'objectId' } } }
);
interactionSchema.index({ targetUser: 1, type: 1 });
interactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Interaction', interactionSchema);
