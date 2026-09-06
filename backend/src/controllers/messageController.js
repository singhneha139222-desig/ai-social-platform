const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Interaction = require('../models/Interaction');
const { getIo } = require('../utils/socket');
const ApiResponse = require('../utils/apiResponse');

/**
 * @desc    Get all conversations for the authenticated user
 * @route   GET /api/v1/messages/conversations
 * @access  Private
 */
exports.getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'username displayName avatar')
      .sort({ 'lastMessage.createdAt': -1 })
      .lean();

    // Map unread counts into a top-level unreadCount for the user
    const formattedConversations = conversations.map(conv => {
      const otherParticipant = conv.participants.find(p => p._id.toString() !== userId);
      const unreadCount = conv.unreadCounts?.[userId] || 0;
      
      return {
        _id: conv._id,
        otherParticipant,
        lastMessage: conv.lastMessage,
        unreadCount,
        status: conv.status,
        initiator: conv.initiator,
        updatedAt: conv.updatedAt
      };
    });

    return ApiResponse.success(res, { conversations: formattedConversations }, 'Conversations retrieved successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create or get a one-to-one conversation
 * @route   POST /api/v1/messages/conversations
 * @access  Private
 */
exports.createConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { userId: targetUserId } = req.body;

    if (!targetUserId) {
      return ApiResponse.badRequest(res, 'Target user ID is required');
    }

    if (userId === targetUserId) {
      return ApiResponse.badRequest(res, 'Cannot create a conversation with yourself');
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return ApiResponse.notFound(res, 'Target user not found');
    }

    // Sort IDs deterministically to ensure unique conversation per pair
    const participants = [userId, targetUserId].sort();

    // Check if conversation already exists
    let conversation = await Conversation.findOne({ participants });

    if (!conversation) {
      // Check if targetUser follows currentUser
      const follows = await Interaction.findOne({
        user: targetUserId,
        targetUser: userId,
        type: 'follow'
      });

      if (!follows) {
        const policy = targetUser.preferences?.messageRequestPolicy || 'everyone';
        
        if (policy === 'none') {
          return ApiResponse.forbidden(res, 'This user does not accept message requests.');
        }
        
        if (policy === 'followers') {
          // Check if currentUser follows targetUser
          const currentUserFollowsTarget = await Interaction.findOne({
            user: userId,
            targetUser: targetUserId,
            type: 'follow'
          });
          
          if (!currentUserFollowsTarget) {
            return ApiResponse.forbidden(res, 'This user only accepts message requests from followers.');
          }
        }
      }

      // Create new conversation
      conversation = await Conversation.create({
        participants,
        status: follows ? 'accepted' : 'pending',
        initiator: userId,
        unreadCounts: {
          [userId]: 0,
          [targetUserId]: 0
        }
      });
    }

    // Populate before returning
    await conversation.populate('participants', 'username displayName avatar');

    const formattedConversation = {
      _id: conversation._id,
      otherParticipant: conversation.participants.find(p => p._id.toString() !== userId),
      lastMessage: conversation.lastMessage,
      unreadCount: conversation.unreadCounts?.get(userId) || 0,
      status: conversation.status,
      initiator: conversation.initiator,
      updatedAt: conversation.updatedAt
    };

    return ApiResponse.success(res, { conversation: formattedConversation }, 'Conversation retrieved successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get messages for a conversation
 * @route   GET /api/v1/messages/conversations/:conversationId
 * @access  Private
 */
exports.getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const skip = (page - 1) * limit;

    // Check authorization
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return ApiResponse.notFound(res, 'Conversation not found');
    }

    if (!conversation.participants.includes(userId)) {
      return ApiResponse.forbidden(res, 'Unauthorized to access this conversation');
    }

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Message.countDocuments({ conversationId });
    
    // The messages are returned sorted descending (newest first).
    // The frontend should reverse them or display bottom-up.
    return ApiResponse.success(res, {
      messages,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    }, 'Messages retrieved successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Send a message
 * @route   POST /api/v1/messages/conversations/:conversationId/messages
 * @access  Private
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { text, stickerUrl, mediaUrl, mediaType } = req.body;
    const senderId = req.user.id;

    if ((!text || !text.trim()) && !stickerUrl && !mediaUrl) {
      return ApiResponse.badRequest(res, 'Message text, sticker, or media is required');
    }

    if (text && text.trim().length > 1000) {
      return ApiResponse.badRequest(res, 'Message text must be 1000 characters or less');
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return ApiResponse.notFound(res, 'Conversation not found');
    }

    if (!conversation.participants.includes(senderId)) {
      return ApiResponse.forbidden(res, 'Unauthorized to send message in this conversation');
    }

    // Determine receiver
    const receiverId = conversation.participants.find(id => id.toString() !== senderId);

    // Create the message
    const message = await Message.create({
      conversationId,
      senderId,
      receiverId,
      text: text ? text.trim() : '',
      stickerUrl: stickerUrl || null,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      status: 'sent'
    });

    let lastMessageText = message.text;
    if (message.mediaUrl) {
      lastMessageText = `[${message.mediaType === 'audio' ? 'Voice Message' : (message.mediaType === 'image' ? 'Image' : 'Media')}] ${message.text || ''}`.trim();
    } else if (message.stickerUrl) {
      lastMessageText = `[Sticker] ${message.text || ''}`.trim();
    }

    const updatePath = `unreadCounts.${receiverId}`;
    await Conversation.findByIdAndUpdate(
      conversationId,
      {
        lastMessage: {
          messageId: message._id,
          senderId,
          text: lastMessageText,
          createdAt: message.createdAt
        },
        $inc: { [updatePath]: 1 }
      },
      { new: true }
    );

    // Try to send via Socket.IO
    try {
      const io = getIo();
      const receiverRoom = `user:${receiverId}`;
      
      // Emit to recipient
      io.to(receiverRoom).emit('message:new', message);

      // Note: We don't change status to 'delivered' here just because we emitted.
      // A robust implementation would wait for an ack from the client, 
      // but for this FYP, we'll let the client emit 'message:delivered' back to server when it receives it.
    } catch (socketErr) {
      console.error('Socket error on send message:', socketErr);
    }

    return ApiResponse.success(res, { message }, 'Message sent successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Mark conversation messages as read
 * @route   PATCH /api/v1/messages/conversations/:conversationId/read
 * @access  Private
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return ApiResponse.notFound(res, 'Conversation not found');
    }

    if (!conversation.participants.includes(userId)) {
      return ApiResponse.forbidden(res, 'Unauthorized access');
    }

    // Determine the other participant
    const otherParticipantId = conversation.participants.find(id => id.toString() !== userId);

    // Update messages sent BY the other participant that are NOT 'read' yet
    await Message.updateMany(
      {
        conversationId,
        senderId: otherParticipantId,
        status: { $ne: 'read' }
      },
      {
        $set: {
          status: 'read',
          readAt: new Date()
        }
      }
    );

    // Reset unread count for current user
    const updatePath = `unreadCounts.${userId}`;
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { [updatePath]: 0 }
    });

    // Notify the other participant that their messages were read
    try {
      const io = getIo();
      io.to(`user:${otherParticipantId}`).emit('message:read', {
        conversationId,
        readBy: userId,
        readAt: new Date()
      });
    } catch (socketErr) {
      console.error('Socket error on markAsRead:', socketErr);
    }

    return ApiResponse.success(res, {}, 'Messages marked as read');
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Accept a message request
 * @route   PATCH /api/v1/messages/conversations/:conversationId/accept
 * @access  Private
 */
exports.acceptRequest = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return ApiResponse.notFound(res, 'Conversation not found');
    }

    if (!conversation.participants.includes(userId)) {
      return ApiResponse.forbidden(res, 'Unauthorized access');
    }

    if (conversation.status === 'accepted') {
      return ApiResponse.success(res, { conversation }, 'Conversation already accepted');
    }

    conversation.status = 'accepted';
    await conversation.save();

    // Optionally emit an event to the initiator so their UI updates
    const otherParticipantId = conversation.participants.find(id => id.toString() !== userId);
    try {
      const io = getIo();
      io.to(`user:${otherParticipantId}`).emit('request:accepted', { conversationId });
    } catch (socketErr) {
      console.error('Socket error on acceptRequest:', socketErr);
    }

    return ApiResponse.success(res, { conversation }, 'Request accepted');
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a conversation (Decline request or delete chat)
 * @route   DELETE /api/v1/messages/conversations/:conversationId
 * @access  Private
 */
exports.deleteConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return ApiResponse.notFound(res, 'Conversation not found');
    }

    if (!conversation.participants.includes(userId)) {
      return ApiResponse.forbidden(res, 'Unauthorized access');
    }

    // Delete conversation and all its messages
    await Message.deleteMany({ conversationId });
    await Conversation.findByIdAndDelete(conversationId);

    return ApiResponse.success(res, {}, 'Conversation deleted successfully');
  } catch (err) {
    next(err);
  }
};
