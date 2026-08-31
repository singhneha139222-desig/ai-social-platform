const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Generate JWT token for a user.
 */
function generateToken(userId) {
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/**
 * POST /api/v1/auth/register
 */
async function register(req, res, next) {
  try {
    const { username, email, password, displayName } = req.body;

    // Check existing
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'Email' : 'Username';
      return ApiResponse.conflict(res, `${field} already exists`, 'DUPLICATE_USER');
    }

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      passwordHash: password, // hashed by pre-save hook
      displayName: displayName || username,
    });

    const token = generateToken(user._id);

    logger.info('User registered:', { userId: user._id, username: user.username });

    return ApiResponse.created(res, {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatar: user.avatar,
      },
    }, 'Registration successful');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      return ApiResponse.unauthorized(res, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return ApiResponse.unauthorized(res, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const token = generateToken(user._id);

    logger.info('User logged in:', { userId: user._id, username: user.username });

    return ApiResponse.success(res, {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
      },
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/auth/me
 */
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return ApiResponse.notFound(res, 'User not found');
    }

    return ApiResponse.success(res, { user });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, getMe };
