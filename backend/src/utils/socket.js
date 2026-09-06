const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const logger = require('./logger');
const User = require('../models/User');

let io;

/**
 * Initialize the Socket.IO server
 * @param {import('http').Server} httpServer
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret);
      
      // Ensure user exists (optional but recommended for consistency)
      const user = await User.findById(decoded.id).select('_id');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Attach user ID to socket
      socket.userId = decoded.id;
      next();
    } catch (err) {
      logger.error('Socket authentication failed:', err.message);
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  // In-memory registry for user presence (userId -> Set of socketIds)
  const userSockets = new Map();

  io.on('connection', (socket) => {
    const userId = socket.userId;
    logger.info(`Socket connected for user: ${userId} (socket.id: ${socket.id})`);

    // Track presence
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
      // Broadcast online status to others
      socket.broadcast.emit('presence:update', { userId, status: 'online' });
    }
    userSockets.get(userId).add(socket.id);

    // Send the current list of online users to the newly connected socket
    const onlineUserIds = Array.from(userSockets.keys());
    socket.emit('presence:initial_state', onlineUserIds);

    // Join private room derived by server
    const userRoom = `user:${userId}`;
    socket.join(userRoom);

    // Messaging Events
    socket.on('typing:start', ({ receiverId, conversationId }) => {
      socket.to(`user:${receiverId}`).emit('typing:start', { senderId: userId, conversationId });
    });

    socket.on('typing:stop', ({ receiverId, conversationId }) => {
      socket.to(`user:${receiverId}`).emit('typing:stop', { senderId: userId, conversationId });
    });

    socket.on('message:delivered', async ({ messageId, senderId, conversationId }) => {
      try {
        const Message = require('../models/Message');
        await Message.findByIdAndUpdate(messageId, { status: 'delivered' });
        // Notify the sender that message was delivered
        socket.to(`user:${senderId}`).emit('message:delivered', { messageId, conversationId, deliveredAt: new Date() });
      } catch (err) {
        logger.error('Error handling message:delivered:', err);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected for user: ${userId} (socket.id: ${socket.id})`);
      
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          // Broadcast offline status
          io.emit('presence:update', { userId, status: 'offline', lastSeen: new Date() });
        }
      }
    });
  });

  return io;
}

/**
 * Get the initialized Socket.IO server instance
 * @returns {Server}
 */
function getIo() {
  if (!io) {
    throw new Error('Socket.IO has not been initialized!');
  }
  return io;
}

module.exports = {
  initSocket,
  getIo,
};
