const Post = require('../models/Post');
const User = require('../models/User');
const Interaction = require('../models/Interaction');
const ModerationLog = require('../models/ModerationLog');
const aiService = require('../services/aiService');
const moderationService = require('../services/moderationService');
const notificationService = require('../services/notificationService');
const ApiResponse = require('../utils/apiResponse');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { PUBLIC_STATUSES, MODERATION_STATUS } = require('../utils/constants');
const logger = require('../utils/logger');
const { wordFrequency } = require('../utils/textProcessing');
const feedCache = require('../services/feedCacheService');
const { getIo } = require('../utils/socket');

/**
 * POST /api/v1/posts
 * 
 * Full moderation pipeline:
 * 1. Validate content
 * 2. Call AI toxicity service
 * 3. Apply moderation policy (publish/flag/reject)
 * 4. If published, call AI sentiment service
 * 5. Save post + moderation log
 * 6. Notify user of moderation result
 * 
 * CRITICAL: If AI service is unavailable, the post is saved as 'pending'
 * and NOT published. We never silently publish unmoderated content.
 */
async function createPost(req, res, next) {
  try {
    const { content, mediaUrl, mediaType, mimeType, mediaSize, stickerUrl } = req.body;
    const authorId = req.user._id;

    const mediaObj = { type: 'none' };
    if (mediaUrl) {
      mediaObj.url = mediaUrl;
      mediaObj.type = mediaType || 'image';
      mediaObj.mimeType = mimeType || null;
      mediaObj.sizeBytes = mediaSize || 0;
    }

    // Step 1: Create post in PENDING state immediately
    const post = await Post.create({
      author: authorId,
      content: content || '',
      media: mediaObj,
      stickerUrl: stickerUrl || null,
      moderationStatus: MODERATION_STATUS.PENDING,
      moderationReason: 'Pending AI review',
      wordFrequencies: content ? wordFrequency(content) : {},
    });

    // Populate for immediate response
    const populatedPost = await Post.findById(post._id).populate('author', 'username displayName avatar');

    // Return 201 Created immediately with pending status
    ApiResponse.created(res, {
      post: populatedPost,
      moderation: {
        status: 'pending',
        decision: 'pending',
        message: 'Your post is being reviewed by AI.',
      },
    }, 'Post submitted for review');

    // Step 2: Asynchronously process moderation
    (async () => {
      try {
        let toxicityResult = null;
        let moderationResult = null;
        let sentimentResult = null;

        // Moderate Media if present
        if (post.media && post.media.url) {
          const mediaUrl = post.media.url; // Cloudinary URL
          
          if (post.media.type === 'image') {
            toxicityResult = await aiService.analyzeImage(mediaUrl);
          } else if (post.media.type === 'video') {
            toxicityResult = await aiService.analyzeVideo(mediaUrl);
          }
          moderationResult = moderationService.moderateMedia(toxicityResult);
        } else {
          // Moderate Text only if content exists
          if (content && content.trim().length > 0) {
            toxicityResult = await aiService.analyzeToxicity(content);
            moderationResult = moderationService.moderate(toxicityResult);
          } else {
            // Safe by default if only a sticker was posted
            toxicityResult = { categories: {}, model: 'bypass' };
            moderationResult = { decision: 'publish', status: 'published', toxicityScore: 0.0, reason: 'Sticker only' };
          }
        }
        // If published and has content, run sentiment analysis
        if (moderationResult.decision === 'publish' && content && content.trim().length > 0) {
          try {
            sentimentResult = await aiService.analyzeSentiment(content);
          } catch (error) {
            logger.warn('Sentiment analysis unavailable:', error.message);
          }
        }

        // Update post with moderation results
        post.toxicityScore = moderationResult.toxicityScore;
        post.toxicityCategories = toxicityResult.categories || {};
        post.moderationStatus = moderationResult.status;
        post.moderationReason = moderationResult.reason;
        
        // Save XAI Explanation if available
        if (toxicityResult.explanation) {
          post.explanation = toxicityResult.explanation;
        }
        
        post.sentiment = sentimentResult?.label || null;
        post.sentimentScore = sentimentResult?.score || null;
        post.aiMetadata = {
          model: moderationResult.model || toxicityResult.model || null,
          inferenceTimeMs: moderationResult.inferenceTimeMs || null,
        };
        await post.save();

        // Create moderation log
        await ModerationLog.create({
          post: post._id,
          contentType: 'post',
          model: toxicityResult.model || 'unitary/toxic-bert',
          toxicityScore: moderationResult.toxicityScore,
          toxicityCategories: toxicityResult.categories || {},
          decision: moderationResult.decision,
          moderationStatus: moderationResult.status,
          reason: moderationResult.reason,
          source: 'ai_auto',
        });

        // Notify user and invalidate feed cache
        if (moderationResult.decision === 'publish') {
          feedCache.invalidateGlobal();
        }
        await notificationService.notifyModeration(authorId, post._id, moderationResult.status);

        // Emit real-time Socket.IO event to the post author
        try {
          const io = getIo();
          
          const socketPayload = {
            postId: post._id.toString(),
            status: moderationResult.status,
            decision: moderationResult.decision,
            toxicity: moderationResult.toxicityScore,
            model: moderationResult.model || toxicityResult.model || null,
            explanationAvailable: !!toxicityResult.explanation
          };
          
          if (toxicityResult.explanation && toxicityResult.explanation.status === 'success') {
            socketPayload.explanation = {
              method: toxicityResult.explanation.method,
              targetCategory: toxicityResult.explanation.targetCategory,
              topTokens: toxicityResult.explanation.topTokens,
              summary: toxicityResult.explanation.summary
            };
          }
          
          io.to(`user:${authorId}`).emit('moderation:update', socketPayload);
        } catch (socketErr) {
          logger.error('Failed to emit moderation:update via Socket.IO:', socketErr.message);
        }

      } catch (error) {
        logger.error('AI moderation failed during background processing:', error.message);
        
        // Fail-safe: Update post to reflect failure, keep as pending/flagged
        post.moderationReason = 'AI moderation service unavailable — pending manual review';
        await post.save();

        await ModerationLog.create({
          post: post._id,
          contentType: 'post',
          model: 'unavailable',
          toxicityScore: null,
          decision: 'flag',
          moderationStatus: MODERATION_STATUS.PENDING,
          reason: 'AI moderation service unavailable',
          source: 'ai_auto',
        });

        await notificationService.notifyModeration(authorId, post._id, 'flagged');

        try {
          const io = getIo();
          io.to(`user:${authorId}`).emit('moderation:update', {
            postId: post._id.toString(),
            status: 'pending',
            decision: 'failed',
            message: 'Content moderation is temporarily unavailable. Your post is pending review.'
          });
        } catch (socketErr) {
          logger.error('Failed to emit moderation:update fallback:', socketErr.message);
        }
      }
    })(); // Execute background task

  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/posts/:id
 */
async function getPost(req, res, next) {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username displayName avatar');

    if (!post) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    // Don't show rejected/removed posts to non-authors and non-admins
    const isAuthor = req.user._id.toString() === post.author._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!PUBLIC_STATUSES.includes(post.moderationStatus) && !isAuthor && !isAdmin) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    // Check if current user has liked this post
    const liked = await Interaction.findOne({
      user: req.user._id,
      post: post._id,
      type: 'like',
    });

    return ApiResponse.success(res, {
      post: {
        ...post.toJSON(),
        isLiked: !!liked,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/posts/:id
 */
async function deletePost(req, res, next) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    const isAuthor = req.user._id.toString() === post.author.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isAuthor && !isAdmin) {
      return ApiResponse.forbidden(res, 'Not authorized to delete this post');
    }

    await Post.findByIdAndDelete(post._id);

    // Clean up related data
    const Comment = require('../models/Comment');
    await Promise.all([
      Comment.deleteMany({ post: post._id }),
      Interaction.deleteMany({ post: post._id }),
    ]);

    feedCache.invalidateGlobal();
    logger.info('Post deleted:', { postId: post._id, deletedBy: req.user._id });

    return ApiResponse.success(res, null, 'Post deleted');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/posts/user/:userId
 */
async function getUserPosts(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const userId = req.params.userId;

    const user = await User.findById(userId);
    if (!user) return ApiResponse.notFound(res, 'User not found');

    const isSelf = req.user._id.toString() === userId;
    const isAdmin = req.user.role === 'admin';
    let isFollowing = false;

    if (!isSelf && !isAdmin) {
      isFollowing = await Interaction.exists({
        user: req.user._id,
        targetUser: userId,
        type: 'follow'
      });
      
      // Privacy check
      if (user.preferences && user.preferences.isPrivate && !isFollowing) {
        return ApiResponse.success(res, {
          posts: [],
          pagination: buildPaginationMeta(0, page, limit),
        });
      }
    }

    const filter = { author: userId };
    if (!isSelf && !isAdmin) {
      filter.moderationStatus = { $in: PUBLIC_STATUSES };
    }

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username displayName avatar')
        .lean(),
      Post.countDocuments(filter),
    ]);

    // Check which posts the user has liked
    const postIds = posts.map((p) => p._id);
    const userLikes = await Interaction.find({
      user: req.user._id,
      post: { $in: postIds },
      type: 'like',
    }).lean();
    const likedPostIds = new Set(userLikes.map((l) => l.post.toString()));

    const postsWithLikeStatus = posts.map((p) => ({
      ...p,
      isLiked: likedPostIds.has(p._id.toString()),
    }));

    return ApiResponse.success(res, {
      posts: postsWithLikeStatus,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/posts/:id/share
 */
async function sharePost(req, res, next) {
  try {
    const postId = req.params.id;
    
    const post = await Post.findById(postId);
    if (!post || !PUBLIC_STATUSES.includes(post.moderationStatus)) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    await Post.findByIdAndUpdate(postId, { $inc: { sharesCount: 1 } });
    
    return ApiResponse.success(res, { shared: true }, 'Post shared');
  } catch (error) {
    next(error);
  }
}

module.exports = { createPost, getPost, deletePost, getUserPosts, sharePost };
