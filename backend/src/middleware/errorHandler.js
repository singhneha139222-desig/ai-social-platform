const logger = require('../utils/logger');

/**
 * Centralized error handling middleware.
 * Catches all unhandled errors and returns a consistent JSON response.
 * Never exposes stack traces in production.
 */
const errorHandler = (err, req, res, _next) => {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', '),
      code: 'VALIDATION_ERROR',
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
      code: 'DUPLICATE_KEY',
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      code: 'INVALID_ID',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal server error' : err.message,
    code: err.code || 'INTERNAL_ERROR',
  });
};

module.exports = errorHandler;
