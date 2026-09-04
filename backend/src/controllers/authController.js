const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const config = require('../config/env');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const sendEmail = require('../utils/sendEmail');

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

/**
 * POST /api/v1/auth/forgot-password
 */
async function forgotPassword(req, res, next) {
  try {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });

    if (!user) {
      return ApiResponse.notFound(res, 'There is no user with that email');
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset url
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password reset token',
        message,
      });

      return ApiResponse.success(res, null, 'Email sent');
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });
      logger.error('Error sending email:', err);

      return ApiResponse.internal(res, 'Email could not be sent');
    }
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/reset-password/:token
 */
async function resetPassword(req, res, next) {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return ApiResponse.badRequest(res, 'Invalid token or token expired');
    }

    // Set new password (the pre-save hook will hash it)
    user.passwordHash = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const token = generateToken(user._id);

    logger.info('User reset password:', { userId: user._id, username: user.username });

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
      },
    }, 'Password reset successful');
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, getMe, forgotPassword, resetPassword };
