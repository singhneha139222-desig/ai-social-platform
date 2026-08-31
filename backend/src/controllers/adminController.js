const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const ModerationLog = require('../models/ModerationLog');
const notificationService = require('../services/notificationService');
const ApiResponse = require('../utils/apiResponse');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { MODERATION_STATUS } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * GET /api/v1/admin/moderation/flagged
 * Get all flagged/pending content for admin review.
 */
async function getFlaggedPosts(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { type } = req.query; // 'post' or 'comment'

    if (type === 'comment') {
      const [comments, total] = await Promise.all([
        Comment.find({
          moderationStatus: { $in: [MODERATION_STATUS.FLAGGED, MODERATION_STATUS.PENDING] },
        })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('author', 'username displayName avatar')
          .populate('post', 'content'),
        Comment.countDocuments({
          moderationStatus: { $in: [MODERATION_STATUS.FLAGGED, MODERATION_STATUS.PENDING] },
        }),
      ]);

      return ApiResponse.success(res, {
        items: comments,
        contentType: 'comment',
        pagination: buildPaginationMeta(total, page, limit),
      });
    }

    // Default: posts
    const [posts, total] = await Promise.all([
      Post.find({
        moderationStatus: { $in: [MODERATION_STATUS.FLAGGED, MODERATION_STATUS.PENDING] },
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username displayName avatar'),
      Post.countDocuments({
        moderationStatus: { $in: [MODERATION_STATUS.FLAGGED, MODERATION_STATUS.PENDING] },
      }),
    ]);

    return ApiResponse.success(res, {
      items: posts,
      contentType: 'post',
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/admin/moderation/:id
 * Get moderation details for a specific post or comment.
 */
async function getModerationDetail(req, res, next) {
  try {
    const { id } = req.params;
    const { type } = req.query;

    if (type === 'comment') {
      const comment = await Comment.findById(id)
        .populate('author', 'username displayName avatar')
        .populate('post', 'content');
      if (!comment) {
        return ApiResponse.notFound(res, 'Comment not found');
      }
      const logs = await ModerationLog.find({ comment: id })
        .sort({ createdAt: -1 })
        .populate('adminId', 'username displayName');
      return ApiResponse.success(res, { item: comment, logs, contentType: 'comment' });
    }

    const post = await Post.findById(id)
      .populate('author', 'username displayName avatar');

    if (!post) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    const logs = await ModerationLog.find({ post: id })
      .sort({ createdAt: -1 })
      .populate('adminId', 'username displayName');

    return ApiResponse.success(res, { item: post, logs, contentType: 'post' });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/admin/moderation/:id/approve
 */
async function approveContent(req, res, next) {
  try {
    const { id } = req.params;
    const { type, reason } = req.body;
    const adminId = req.user._id;

    if (type === 'comment') {
      const comment = await Comment.findById(id);
      if (!comment) return ApiResponse.notFound(res, 'Comment not found');

      comment.moderationStatus = MODERATION_STATUS.APPROVED_BY_ADMIN;
      await comment.save();

      // Update post comment count
      await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: 1 } });

      await ModerationLog.create({
        comment: id,
        contentType: 'comment',
        model: 'admin',
        toxicityScore: comment.toxicityScore,
        decision: 'publish',
        moderationStatus: MODERATION_STATUS.APPROVED_BY_ADMIN,
        reason: reason || 'Approved by admin',
        adminAction: 'approve',
        adminId,
        source: 'admin_manual',
      });

      logger.info('Comment approved by admin:', { commentId: id, adminId });
      return ApiResponse.success(res, { comment }, 'Comment approved');
    }

    const post = await Post.findById(id);
    if (!post) return ApiResponse.notFound(res, 'Post not found');

    post.moderationStatus = MODERATION_STATUS.APPROVED_BY_ADMIN;
    await post.save();

    await ModerationLog.create({
      post: id,
      contentType: 'post',
      model: 'admin',
      toxicityScore: post.toxicityScore,
      decision: 'publish',
      moderationStatus: MODERATION_STATUS.APPROVED_BY_ADMIN,
      reason: reason || 'Approved by admin',
      adminAction: 'approve',
      adminId,
      source: 'admin_manual',
    });

    await notificationService.notifyModeration(post.author, post._id, 'approved_by_admin');

    logger.info('Post approved by admin:', { postId: id, adminId });

    return ApiResponse.success(res, { post }, 'Post approved');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/admin/moderation/:id/reject
 */
async function rejectContent(req, res, next) {
  try {
    const { id } = req.params;
    const { type, reason } = req.body;
    const adminId = req.user._id;

    if (type === 'comment') {
      const comment = await Comment.findById(id);
      if (!comment) return ApiResponse.notFound(res, 'Comment not found');

      comment.moderationStatus = MODERATION_STATUS.REJECTED_BY_ADMIN;
      await comment.save();

      await ModerationLog.create({
        comment: id,
        contentType: 'comment',
        model: 'admin',
        toxicityScore: comment.toxicityScore,
        decision: 'reject',
        moderationStatus: MODERATION_STATUS.REJECTED_BY_ADMIN,
        reason: reason || 'Rejected by admin',
        adminAction: 'reject',
        adminId,
        source: 'admin_manual',
      });

      logger.info('Comment rejected by admin:', { commentId: id, adminId });
      return ApiResponse.success(res, { comment }, 'Comment rejected');
    }

    const post = await Post.findById(id);
    if (!post) return ApiResponse.notFound(res, 'Post not found');

    post.moderationStatus = MODERATION_STATUS.REJECTED_BY_ADMIN;
    await post.save();

    await ModerationLog.create({
      post: id,
      contentType: 'post',
      model: 'admin',
      toxicityScore: post.toxicityScore,
      decision: 'reject',
      moderationStatus: MODERATION_STATUS.REJECTED_BY_ADMIN,
      reason: reason || 'Rejected by admin',
      adminAction: 'reject',
      adminId,
      source: 'admin_manual',
    });

    await notificationService.notifyModeration(post.author, post._id, 'rejected_by_admin');

    logger.info('Post rejected by admin:', { postId: id, adminId });

    return ApiResponse.success(res, { post }, 'Post rejected');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/admin/stats
 */
async function getStats(req, res, next) {
  try {
    const [
      totalUsers,
      totalPosts,
      publishedPosts,
      flaggedPosts,
      rejectedPosts,
      pendingPosts,
      totalComments,
      recentModerationLogs,
    ] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Post.countDocuments({ moderationStatus: { $in: ['published', 'approved_by_admin'] } }),
      Post.countDocuments({ moderationStatus: 'flagged' }),
      Post.countDocuments({ moderationStatus: { $in: ['rejected', 'rejected_by_admin'] } }),
      Post.countDocuments({ moderationStatus: 'pending' }),
      Comment.countDocuments(),
      ModerationLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('adminId', 'username displayName'),
    ]);

    // Sentiment distribution
    const sentimentDistribution = await Post.aggregate([
      { $match: { moderationStatus: { $in: ['published', 'approved_by_admin'] }, sentiment: { $ne: null } } },
      { $group: { _id: '$sentiment', count: { $sum: 1 } } },
    ]);

    return ApiResponse.success(res, {
      stats: {
        totalUsers,
        totalPosts,
        publishedPosts,
        flaggedPosts,
        rejectedPosts,
        pendingPosts,
        totalComments,
        sentimentDistribution: sentimentDistribution.reduce(
          (acc, item) => ({ ...acc, [item._id]: item.count }),
          {}
        ),
      },
      recentModerationLogs,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getFlaggedPosts,
  getModerationDetail,
  approveContent,
  rejectContent,
  getStats,
};
