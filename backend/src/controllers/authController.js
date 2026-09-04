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
 * Normalize a phone number to standard format (digits only, optionally keeping +)
 */
function normalizePhone(phone) {
  if (!phone) return null;
  // Keep '+' if it's the first character, otherwise strip all non-digits
  const isPlus = phone.trim().startsWith('+');
  const digitsOnly = phone.replace(/\D/g, '');
  if (!digitsOnly) return null;
  return isPlus ? `+${digitsOnly}` : digitsOnly;
}

/**
 * Helper to determine if a string is an email
 */
function isEmail(str) {
  return str.includes('@');
}

/**
 * POST /api/v1/auth/register
 */
async function register(req, res, next) {
  try {
    const { username, contact, password, displayName, dateOfBirth } = req.body;

    let email = null;
    let phone = null;

    if (isEmail(contact)) {
      email = contact.toLowerCase();
    } else {
      phone = normalizePhone(contact);
      if (!phone) {
        return ApiResponse.badRequest(res, 'Invalid mobile number format');
      }
    }

    // Check existing
    const queryConds = [{ username }];
    if (email) queryConds.push({ email });
    if (phone) queryConds.push({ phone });

    const existingUser = await User.findOne({ $or: queryConds });

    if (existingUser) {
      return ApiResponse.conflict(res, 'An account with this email, mobile number, or username already exists.', 'DUPLICATE_USER');
    }

    const user = await User.create({
      username,
      email,
      phone,
      passwordHash: password, // hashed by pre-save hook
      displayName: displayName || username,
      dateOfBirth,
    });

    const token = generateToken(user._id);

    logger.info('User registered:', { userId: user._id, username: user.username });

    return ApiResponse.created(res, {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
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
    const { identifier, password } = req.body;

    let email = null;
    let phone = null;
    let username = null;

    if (isEmail(identifier)) {
      email = identifier.toLowerCase();
    } else {
      phone = normalizePhone(identifier);
      username = identifier;
    }

    const queryConds = [];
    if (email) queryConds.push({ email });
    if (phone) queryConds.push({ phone });
    if (username) queryConds.push({ username });

    const user = await User.findOne({ $or: queryConds }).select('+passwordHash');
    
    if (!user) {
      return ApiResponse.unauthorized(res, 'Invalid login credentials.', 'INVALID_CREDENTIALS');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return ApiResponse.unauthorized(res, 'Invalid login credentials.', 'INVALID_CREDENTIALS');
    }

    const token = generateToken(user._id);

    logger.info('User logged in:', { userId: user._id, username: user.username });

    return ApiResponse.success(res, {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
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
