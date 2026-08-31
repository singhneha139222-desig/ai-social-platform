const Comment = require('../models/Comment');
const Post = require('../models/Post');
const ModerationLog = require('../models/ModerationLog');
const Interaction = require('../models/Interaction');
const aiService = require('../services/aiService');
const moderationService = require('../services/moderationService');
const notificationService = require('../services/notificationService');
const ApiResponse = require('../utils/apiResponse');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { PUBLIC_STATUSES, MODERATION_STATUS } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * POST /api/v1/posts/:postId/comments
 * 
 * Same AI moderation pipeline as posts:
 * 1. Validate content
 * 2. Call AI toxicity service
 * 3. Apply moderation policy (publish/flag/reject)
 * 4. Save comment + moderation log
 * 
 * If AI service unavailable, comment is saved as pending.
 */
async function createComment(req, res, next) {
  try {
    const { content, parentComment } = req.body;
    const postId = req.params.postId;
    const authorId = req.user._id;

    // Verify post exists and is publicly visible
    const post = await Post.findById(postId);
    if (!post || !PUBLIC_STATUSES.includes(post.moderationStatus)) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    // If parentComment provided, verify it exists
    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (!parent || parent.post.toString() !== postId) {
        return ApiResponse.badRequest(res, 'Parent comment not found');
      }
    }

    let toxicityResult = null;
    let moderationResult = null;
    let aiAvailable = true;

    // Toxicity analysis
    try {
      toxicityResult = await aiService.analyzeToxicity(content);
      moderationResult = moderationService.moderate(toxicityResult);
    } catch (error) {
      logger.error('AI moderation unavailable during comment creation:', error.message);
      aiAvailable = false;
    }

    // Fail-safe: save as pending if AI unavailable
    if (!aiAvailable) {
      const comment = await Comment.create({
        post: postId,
        author: authorId,
        content,
        parentComment: parentComment || null,
        moderationStatus: MODERATION_STATUS.PENDING,
        moderationReason: 'AI moderation service unavailable — pending manual review',
      });

      await ModerationLog.create({
        comment: comment._id,
        contentType: 'comment',
        model: 'unavailable',
        toxicityScore: null,
        decision: 'flag',
        moderationStatus: MODERATION_STATUS.PENDING,
        reason: 'AI moderation service unavailable',
        source: 'ai_auto',
      });

      const populated = await Comment.findById(comment._id)
        .populate('author', 'username displayName avatar');

      return ApiResponse.created(res, {
        comment: populated,
        moderation: {
          status: 'pending',
          message: 'Your comment is being reviewed.',
        },
      }, 'Comment submitted for review');
    }

    // Create comment with moderation result
    const comment = await Comment.create({
      post: postId,
      author: authorId,
      content,
      parentComment: parentComment || null,
      toxicityScore: moderationResult.toxicityScore,
      moderationStatus: moderationResult.status,
      moderationReason: moderationResult.reason,
    });

    // Create moderation log
    await ModerationLog.create({
      comment: comment._id,
      contentType: 'comment',
      model: toxicityResult.model || 'unitary/toxic-bert',
      toxicityScore: moderationResult.toxicityScore,
      toxicityCategories: toxicityResult.categories || {},
      decision: moderationResult.decision,
      moderationStatus: moderationResult.status,
      reason: moderationResult.reason,
      source: 'ai_auto',
    });

    // Update post comment count if published
    if (moderationResult.status === MODERATION_STATUS.PUBLISHED) {
      await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

      // Record interaction
      await Interaction.create({
        user: authorId,
        post: postId,
        type: 'comment',
      }).catch(() => {}); // ignore duplicate

      // Notify post author
      await notificationService.notifyComment(authorId, post.author, postId);
    }

    const populated = await Comment.findById(comment._id)
      .populate('author', 'username displayName avatar');

    const messages = {
      publish: 'Comment posted.',
      flag: 'Your comment is pending review.',
      reject: 'Your comment could not be posted because it did not meet our content guidelines.',
    };

    return ApiResponse.created(res, {
      comment: populated,
      moderation: {
        status: moderationResult.status,
        decision: moderationResult.decision,
        message: messages[moderationResult.decision],
      },
    }, messages[moderationResult.decision]);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/posts/:postId/comments
 */
async function getComments(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const postId = req.params.postId;

    const filter = {
      post: postId,
      moderationStatus: { $in: PUBLIC_STATUSES },
      parentComment: null, // top-level comments only
    };

    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username displayName avatar'),
      Comment.countDocuments(filter),
    ]);

    // Fetch replies for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({
          parentComment: comment._id,
          moderationStatus: { $in: PUBLIC_STATUSES },
        })
          .sort({ createdAt: 1 })
          .limit(10)
          .populate('author', 'username displayName avatar');

        return {
          ...comment.toJSON(),
          replies,
        };
      })
    );

    return ApiResponse.success(res, {
      comments: commentsWithReplies,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/comments/:id
 */
async function deleteComment(req, res, next) {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return ApiResponse.notFound(res, 'Comment not found');
    }

    const isAuthor = req.user._id.toString() === comment.author.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isAuthor && !isAdmin) {
      return ApiResponse.forbidden(res, 'Not authorized to delete this comment');
    }

    await Comment.findByIdAndDelete(comment._id);

    // Decrement comment count if comment was published
    if (PUBLIC_STATUSES.includes(comment.moderationStatus)) {
      await Post.findByIdAndUpdate(comment.post, {
        $inc: { commentsCount: -1 },
      });
    }

    return ApiResponse.success(res, null, 'Comment deleted');
  } catch (error) {
    next(error);
  }
}

module.exports = { createComment, getComments, deleteComment };
