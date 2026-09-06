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
      required: function() {
        return !this.stickerUrl && (!this.media || this.media.type === 'none');
      },
      trim: true,
      maxlength: 2000,
    },
    stickerUrl: {
      type: String,
      default: null,
    },
    wordFrequencies: {
      type: Map,
      of: Number,
      default: {},
    },
    // --- Media fields ---
    media: {
      type: {
        type: String,
        enum: ['image', 'video', 'none'],
        default: 'none'
      },
      url: { type: String, default: null },
      mimeType: { type: String, default: null },
      sizeBytes: { type: Number, default: 0 }
    },
    // --- Multilingual fields ---
    language: { type: String, default: 'en' },
    languageConfidence: { type: Number, default: 1.0 },
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
      enum: ['pending', 'processing', 'published', 'flagged', 'rejected', 'removed', 'approved_by_admin', 'rejected_by_admin'],
      default: 'pending',
      index: true,
    },
    moderationReason: {
      type: String,
      default: '',
    },
    explanation: {
      status: { type: String, enum: ['success', 'unavailable', null], default: null },
      method: { type: String, default: null },
      targetCategory: { type: String, default: null },
      topTokens: [
        {
          token: { type: String },
          importance: { type: Number }
        }
      ],
      summary: { type: String, default: null }
    },
    aiMetadata: {
      model: { type: String, default: null },
      inferenceTimeMs: { type: Number, default: null },
      // Support for video frame extraction aggregation data
      framesSampled: { type: Number, default: 0 },
      flaggedFrames: { type: Number, default: 0 },
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
    sharesCount: {
      type: Number,
      default: 0,
    },
    savesCount: {
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
