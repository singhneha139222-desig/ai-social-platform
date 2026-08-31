const ApiResponse = require('../utils/apiResponse');
const { ROLES } = require('../utils/constants');

/**
 * Admin role-based access control middleware.
 * Must be used after auth middleware (req.user must exist).
 */
const admin = (req, res, next) => {
  if (!req.user) {
    return ApiResponse.unauthorized(res, 'Authentication required', 'NO_AUTH');
  }

  if (req.user.role !== ROLES.ADMIN) {
    return ApiResponse.forbidden(res, 'Admin access required', 'ADMIN_REQUIRED');
  }

  next();
};

module.exports = admin;
