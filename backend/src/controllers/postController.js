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
    const { content } = req.body;
    const authorId = req.user._id;

    let toxicityResult = null;
    let moderationResult = null;
    let sentimentResult = null;
    let aiAvailable = true;

    // Step 1: Toxicity analysis
    try {
      toxicityResult = await aiService.analyzeToxicity(content);
      moderationResult = moderationService.moderate(toxicityResult);
    } catch (error) {
      logger.error('AI moderation unavailable during post creation:', error.message);
      aiAvailable = false;
    }

    // Step 2: If AI unavailable, save as pending (fail-safe)
    if (!aiAvailable) {
      const post = await Post.create({
        author: authorId,
        content,
        moderationStatus: MODERATION_STATUS.PENDING,
        moderationReason: 'AI moderation service unavailable — pending manual review',
      });

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

      return ApiResponse.created(res, {
        post: await Post.findById(post._id).populate('author', 'username displayName avatar'),
        moderation: {
          status: 'pending',
          message: 'Your post is being reviewed. The moderation service is temporarily unavailable.',
        },
      }, 'Post submitted for review');
    }

    // Step 3: If published, run sentiment analysis
    if (moderationResult.decision === 'publish') {
      try {
        sentimentResult = await aiService.analyzeSentiment(content);
      } catch (error) {
        logger.warn('Sentiment analysis unavailable, proceeding without sentiment:', error.message);
        // Sentiment is non-blocking — post can still be published without it
      }
    }

    // Step 4: Create the post
    const post = await Post.create({
      author: authorId,
      content,
      toxicityScore: moderationResult.toxicityScore,
      toxicityCategories: toxicityResult.categories || {},
      moderationStatus: moderationResult.status,
      moderationReason: moderationResult.reason,
      sentiment: sentimentResult?.label || null,
      sentimentScore: sentimentResult?.score || null,
      wordFrequencies: wordFrequency(content),
    });

    // Step 5: Create moderation log
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

    // Step 6: Notify user and invalidate feed cache
    feedCache.invalidateGlobal();
    await notificationService.notifyModeration(authorId, post._id, moderationResult.status);

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username displayName avatar');

    // User-friendly moderation messages
    const moderationMessages = {
      publish: 'Your post has been published.',
      flag: 'Your post is pending review.',
      reject: 'Your post could not be published because it did not meet our content guidelines.',
    };

    return ApiResponse.created(res, {
      post: populatedPost,
      moderation: {
        status: moderationResult.status,
        decision: moderationResult.decision,
        message: moderationMessages[moderationResult.decision],
      },
    }, moderationMessages[moderationResult.decision]);
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

module.exports = { createPost, getPost, deletePost, getUserPosts };
