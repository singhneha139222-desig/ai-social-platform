const Post = require('../models/Post');
const User = require('../models/User');
const Interaction = require('../models/Interaction');
const notificationService = require('../services/notificationService');
const ApiResponse = require('../utils/apiResponse');
const { PUBLIC_STATUSES } = require('../utils/constants');

/**
 * POST /api/v1/posts/:id/like
 */
async function likePost(req, res, next) {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post || !PUBLIC_STATUSES.includes(post.moderationStatus)) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    // Check if already liked
    const existing = await Interaction.findOne({
      user: userId,
      post: postId,
      type: 'like',
    });

    if (existing) {
      return ApiResponse.conflict(res, 'Already liked this post', 'ALREADY_LIKED');
    }

    await Interaction.create({
      user: userId,
      post: postId,
      type: 'like',
    });

    await Post.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });

    // Notify post author
    await notificationService.notifyLike(userId, post.author, postId);

    return ApiResponse.success(res, { liked: true }, 'Post liked');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/posts/:id/like
 */
async function unlikePost(req, res, next) {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const existing = await Interaction.findOneAndDelete({
      user: userId,
      post: postId,
      type: 'like',
    });

    if (!existing) {
      return ApiResponse.notFound(res, 'Like not found');
    }

    await Post.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } });

    return ApiResponse.success(res, { liked: false }, 'Post unliked');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/users/:id/follow
 */
async function followUser(req, res, next) {
  try {
    const targetUserId = req.params.id;
    const userId = req.user._id;

    if (userId.toString() === targetUserId) {
      return ApiResponse.badRequest(res, 'Cannot follow yourself');
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return ApiResponse.notFound(res, 'User not found');
    }

    const existing = await Interaction.findOne({
      user: userId,
      targetUser: targetUserId,
      type: 'follow',
    });

    if (existing) {
      return ApiResponse.conflict(res, 'Already following this user', 'ALREADY_FOLLOWING');
    }

    await Interaction.create({
      user: userId,
      targetUser: targetUserId,
      type: 'follow',
    });

    // Update denormalized counts
    await Promise.all([
      User.findByIdAndUpdate(userId, { $inc: { followingCount: 1 } }),
      User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: 1 } }),
    ]);

    await notificationService.notifyFollow(userId, targetUserId);

    return ApiResponse.success(res, { following: true }, 'User followed');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/users/:id/follow
 */
async function unfollowUser(req, res, next) {
  try {
    const targetUserId = req.params.id;
    const userId = req.user._id;

    const existing = await Interaction.findOneAndDelete({
      user: userId,
      targetUser: targetUserId,
      type: 'follow',
    });

    if (!existing) {
      return ApiResponse.notFound(res, 'Follow relationship not found');
    }

    await Promise.all([
      User.findByIdAndUpdate(userId, { $inc: { followingCount: -1 } }),
      User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: -1 } }),
    ]);

    return ApiResponse.success(res, { following: false }, 'User unfollowed');
  } catch (error) {
    next(error);
  }
}

module.exports = { likePost, unlikePost, followUser, unfollowUser };
