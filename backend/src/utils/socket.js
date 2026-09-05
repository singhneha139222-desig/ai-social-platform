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

  io.on('connection', (socket) => {
    const userId = socket.userId;
    logger.info(`Socket connected for user: ${userId} (socket.id: ${socket.id})`);

    // Join private room derived by server
    const userRoom = `user:${userId}`;
    socket.join(userRoom);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected for user: ${userId} (socket.id: ${socket.id})`);
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
