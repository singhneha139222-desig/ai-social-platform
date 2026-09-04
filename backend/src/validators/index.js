const { body } = require('express-validator');
const { CONTENT_LIMITS } = require('../utils/constants');

const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: CONTENT_LIMITS.USERNAME_MIN_LENGTH, max: CONTENT_LIMITS.USERNAME_MAX_LENGTH })
    .withMessage(`Username must be ${CONTENT_LIMITS.USERNAME_MIN_LENGTH}-${CONTENT_LIMITS.USERNAME_MAX_LENGTH} characters`)
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('contact')
    .trim()
    .notEmpty()
    .withMessage('Please provide a mobile number or email address'),
  body('password')
    .isLength({ min: CONTENT_LIMITS.PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${CONTENT_LIMITS.PASSWORD_MIN_LENGTH} characters`),
  body('dateOfBirth')
    .optional() // Can be optional to support legacy users, but we will validate it heavily in the frontend or controller. But the prompt said new registrations should collect them. Let's make it not empty here if they are registering.
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('Invalid date of birth format')
    .custom((value) => {
      if (new Date(value) > new Date()) {
        throw new Error('Date of birth cannot be in the future');
      }
      return true;
    }),
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Display name must be at most 50 characters'),
];

const loginValidation = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Please provide a valid mobile number, username, or email address'),
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
  body('username')
    .optional()
    .trim()
    .isLength({ min: CONTENT_LIMITS.USERNAME_MIN_LENGTH, max: CONTENT_LIMITS.USERNAME_MAX_LENGTH })
    .withMessage(`Username must be ${CONTENT_LIMITS.USERNAME_MIN_LENGTH}-${CONTENT_LIMITS.USERNAME_MAX_LENGTH} characters`)
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
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
  body('gender')
    .optional()
    .isIn(['Male', 'Female', 'Custom', 'Prefer not to say'])
    .withMessage('Invalid gender selection'),
  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('Invalid website URL')
    .or()
    .isEmpty(),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
];

module.exports = {
  registerValidation,
  loginValidation,
  postValidation,
  commentValidation,
  profileUpdateValidation,
};
