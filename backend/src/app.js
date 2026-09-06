const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const feedRoutes = require('./routes/feed');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const messageRoutes = require('./routes/messages');
const mediaRoutes = require('./routes/media');
const botRoutes = require('./routes/bot');

const app = express();

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: false })); // allow images to be loaded
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));

// Serve static uploads (but exclude media which is served via the media route)
const path = require('path');
// We don't expose the entire uploads folder anymore.
// If avatars or other public assets are in uploads/public, they can be served.
// For now, no static serving to prevent direct access to /uploads/media


// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (!config.isProduction) {
  app.use(morgan('dev'));
}

// General rate limiting
// app.use('/api/', apiLimiter);

// Health check
app.get('/health', async (req, res) => {
  const mongoose = require('mongoose');
  const aiService = require('./services/aiService');

  const startMongo = Date.now();
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const mongoTime = Date.now() - startMongo;

  let aiStatus = 'unknown';
  const startAi = Date.now();
  try {
    aiStatus = (await aiService.checkHealth()) ? 'healthy' : 'unhealthy';
  } catch {
    aiStatus = 'unreachable';
  }
  const aiTime = Date.now() - startAi;

  res.json({
    status: 'ok',
    service: 'backend',
    timestamp: new Date().toISOString(),
    metrics: {
      mongoTimeMs: mongoTime,
      aiTimeMs: aiTime,
      totalTimeMs: Date.now() - startMongo
    },
    dependencies: {
      mongodb: mongoStatus,
      aiService: aiStatus,
    },
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1', feedRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/admin/bot-detection', botRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    code: 'NOT_FOUND',
  });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
