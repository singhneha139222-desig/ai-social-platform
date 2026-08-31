const { body } = require('express-validator');
const { CONTENT_LIMITS } = require('../utils/constants');

const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: CONTENT_LIMITS.USERNAME_MIN_LENGTH, max: CONTENT_LIMITS.USERNAME_MAX_LENGTH })
    .withMessage(`Username must be ${CONTENT_LIMITS.USERNAME_MIN_LENGTH}-${CONTENT_LIMITS.USERNAME_MAX_LENGTH} characters`)
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: CONTENT_LIMITS.PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${CONTENT_LIMITS.PASSWORD_MIN_LENGTH} characters`),
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Display name must be at most 50 characters'),
];

const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const postValidation = [
  body('content')
    .trim()
    .isLength({ min: CONTENT_LIMITS.POST_MIN_LENGTH, max: CONTENT_LIMITS.POST_MAX_LENGTH })
    .withMessage(`Post content must be ${CONTENT_LIMITS.POST_MIN_LENGTH}-${CONTENT_LIMITS.POST_MAX_LENGTH} characters`),
];

const commentValidation = [
  body('content')
    .trim()
    .isLength({ min: CONTENT_LIMITS.COMMENT_MIN_LENGTH, max: CONTENT_LIMITS.COMMENT_MAX_LENGTH })
    .withMessage(`Comment must be ${CONTENT_LIMITS.COMMENT_MIN_LENGTH}-${CONTENT_LIMITS.COMMENT_MAX_LENGTH} characters`),
  body('parentComment')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent comment ID'),
];

const profileUpdateValidation = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Display name must be at most 50 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: CONTENT_LIMITS.BIO_MAX_LENGTH })
    .withMessage(`Bio must be at most ${CONTENT_LIMITS.BIO_MAX_LENGTH} characters`),
];

module.exports = {
  registerValidation,
  loginValidation,
  postValidation,
  commentValidation,
  profileUpdateValidation,
};
