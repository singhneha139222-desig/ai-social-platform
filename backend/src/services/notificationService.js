const Notification = require('../models/Notification');
const logger = require('../utils/logger');
const { getIo } = require('../utils/socket');

/**
 * Notification Service.
 * Creates notifications for social interactions and moderation events.
 */

async function createNotification({ recipient, sender, type, post = null, message = '' }) {
  // Don't notify yourself
  if (recipient.toString() === sender.toString()) return null;

  try {
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      post,
      message,
    });

    // Populate sender details for real-time emission
    await notification.populate('sender', 'username displayName avatar profilePicture');
    await notification.populate('post', 'content');

    // Emit Socket.IO event to the recipient's private room
    try {
      const io = getIo();
      io.to(`user:${recipient.toString()}`).emit('notification:new', notification);
    } catch (socketError) {
      // Log but don't fail the REST request if Socket.IO isn't ready/fails
      logger.error('Socket emission failed:', socketError.message);
    }

    return notification;
  } catch (error) {
    // Non-critical — log and continue
    logger.error('Failed to create notification:', error.message);
    return null;
  }
}

async function notifyFollow(senderId, recipientId) {
  return createNotification({
    recipient: recipientId,
    sender: senderId,
    type: 'follow',
    message: 'started following you',
  });
}

async function notifyFollowRequest(senderId, recipientId) {
  return createNotification({
    recipient: recipientId,
    sender: senderId,
    type: 'follow_request',
    message: 'requested to follow you',
  });
}

async function notifyAcceptedFollow(senderId, recipientId) {
  return createNotification({
    recipient: recipientId,
    sender: senderId,
    type: 'accepted_follow_request',
    message: 'accepted your follow request',
  });
}

async function notifyLike(senderId, recipientId, postId) {
  return createNotification({
    recipient: recipientId,
    sender: senderId,
    type: 'like',
    post: postId,
    message: 'liked your post',
  });
}

async function notifyComment(senderId, recipientId, postId) {
  return createNotification({
    recipient: recipientId,
    sender: senderId,
    type: 'comment',
    post: postId,
    message: 'commented on your post',
  });
}

async function notifyModeration(recipientId, postId, status) {
  const messages = {
    published: 'Your post has been published',
    flagged: 'Your post is pending review',
    rejected: 'Your post could not be published because it did not meet our content guidelines',
    approved_by_admin: 'Your post has been approved by a moderator',
    rejected_by_admin: 'Your post was removed by a moderator for violating content guidelines',
  };

  return createNotification({
    recipient: recipientId,
    sender: recipientId, // system notification
    type: 'moderation',
    post: postId,
    message: messages[status] || 'Your post moderation status has been updated',
  });
}

module.exports = {
  createNotification,
  notifyFollow,
  notifyFollowRequest,
  notifyAcceptedFollow,
  notifyLike,
  notifyComment,
  notifyModeration,
};
