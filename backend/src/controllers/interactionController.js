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
      type: { $in: ['follow', 'follow_request'] },
    });

    if (existing) {
      if (existing.type === 'follow') {
        return ApiResponse.conflict(res, 'Already following this user', 'ALREADY_FOLLOWING');
      } else {
        return ApiResponse.conflict(res, 'Follow request already sent', 'ALREADY_REQUESTED');
      }
    }

    if (targetUser.preferences && targetUser.preferences.isPrivate) {
      // Send a follow request instead
      await Interaction.create({
        user: userId,
        targetUser: targetUserId,
        type: 'follow_request',
      });
      await notificationService.notifyFollowRequest(userId, targetUserId);
      return ApiResponse.success(res, { following: false, requested: true }, 'Follow request sent');
    } else {
      // Instant follow
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
      return ApiResponse.success(res, { following: true, requested: false }, 'User followed');
    }
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
      type: { $in: ['follow', 'follow_request'] },
    });

    if (!existing) {
      return ApiResponse.notFound(res, 'Follow relationship not found');
    }

    // Only decrement counts if it was an actual follow, not just a request
    if (existing.type === 'follow') {
      await Promise.all([
        User.findByIdAndUpdate(userId, { $inc: { followingCount: -1 } }),
        User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: -1 } }),
      ]);
    }

    return ApiResponse.success(res, { following: false, requested: false }, 'User unfollowed');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/users/follow-requests
 */
async function getFollowRequests(req, res, next) {
  try {
    const userId = req.user._id;
    const requests = await Interaction.find({
      targetUser: userId,
      type: 'follow_request'
    })
      .sort({ createdAt: -1 })
      .populate('user', 'username displayName avatar bio');

    return ApiResponse.success(res, {
      requests: requests.map(r => ({
        _id: r._id,
        user: r.user,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/users/:id/accept-follow
 */
async function acceptFollowRequest(req, res, next) {
  try {
    const requesterId = req.params.id; // user who sent the request
    const userId = req.user._id;

    const existingRequest = await Interaction.findOne({
      user: requesterId,
      targetUser: userId,
      type: 'follow_request'
    });

    if (!existingRequest) {
      return ApiResponse.notFound(res, 'Follow request not found');
    }

    // Upgrade to follow
    existingRequest.type = 'follow';
    await existingRequest.save();

    await Promise.all([
      User.findByIdAndUpdate(requesterId, { $inc: { followingCount: 1 } }),
      User.findByIdAndUpdate(userId, { $inc: { followersCount: 1 } }),
    ]);

    await notificationService.notifyAcceptedFollow(userId, requesterId);

    // Also delete any old notification for the request, or just let them stack
    // (We'll just let them stack for now)

    return ApiResponse.success(res, null, 'Follow request accepted');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/users/:id/reject-follow
 */
async function rejectFollowRequest(req, res, next) {
  try {
    const requesterId = req.params.id;
    const userId = req.user._id;

    const existingRequest = await Interaction.findOneAndDelete({
      user: requesterId,
      targetUser: userId,
      type: 'follow_request'
    });

    if (!existingRequest) {
      return ApiResponse.notFound(res, 'Follow request not found');
    }

    return ApiResponse.success(res, null, 'Follow request rejected');
  } catch (error) {
    next(error);
  }
}

module.exports = { likePost, unlikePost, followUser, unfollowUser, getFollowRequests, acceptFollowRequest, rejectFollowRequest };
