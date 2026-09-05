const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Post content is required'],
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },
    wordFrequencies: {
      type: Map,
      of: Number,
      default: {},
    },
    // --- Moderation fields ---
    toxicityScore: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    toxicityCategories: {
      // Preserves individual category probabilities from the toxicity model
      type: Map,
      of: Number,
      default: {},
    },
    moderationStatus: {
      type: String,
      enum: ['pending', 'published', 'flagged', 'rejected', 'removed', 'approved_by_admin', 'rejected_by_admin'],
      default: 'pending',
      index: true,
    },
    moderationReason: {
      type: String,
      default: '',
    },
    // --- Sentiment fields ---
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative', null],
      default: null,
    },
    sentimentScore: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    // --- Engagement (denormalized counters) ---
    likesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for feed queries and moderation
postSchema.index({ createdAt: -1 });
postSchema.index({ moderationStatus: 1, createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ toxicityScore: 1 });
postSchema.index({ sentiment: 1 });
postSchema.index({ likesCount: -1 });

module.exports = mongoose.model('Post', postSchema);
