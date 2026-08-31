const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');

/**
 * Middleware that checks express-validator results.
 * Returns 400 with the first validation error if any exist.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return ApiResponse.badRequest(
      res,
      firstError.msg,
      'VALIDATION_ERROR'
    );
  }
  next();
};

module.exports = validate;
