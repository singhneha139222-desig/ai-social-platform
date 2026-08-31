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

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (!config.isProduction) {
  app.use(morgan('dev'));
}

// General rate limiting
app.use('/api/', apiLimiter);

// Health check
app.get('/health', async (req, res) => {
  const mongoose = require('mongoose');
  const aiService = require('./services/aiService');

  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  let aiStatus = 'unknown';
  try {
    aiStatus = (await aiService.checkHealth()) ? 'healthy' : 'unhealthy';
  } catch {
    aiStatus = 'unreachable';
  }

  res.json({
    status: 'ok',
    service: 'backend',
    timestamp: new Date().toISOString(),
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
