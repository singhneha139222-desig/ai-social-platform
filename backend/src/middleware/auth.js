const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');
const ApiResponse = require('../utils/apiResponse');

/**
 * JWT authentication middleware.
 * Extracts token from Authorization header, verifies it,
 * and attaches the user document to req.user.
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized(res, 'No authentication token provided', 'NO_TOKEN');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return ApiResponse.unauthorized(res, 'Token has expired', 'TOKEN_EXPIRED');
      }
      return ApiResponse.unauthorized(res, 'Invalid token', 'INVALID_TOKEN');
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return ApiResponse.unauthorized(res, 'User not found', 'USER_NOT_FOUND');
    }

    req.user = user;
    next();
  } catch (error) {
    return ApiResponse.error(res, 'Authentication error');
  }
};

module.exports = auth;
