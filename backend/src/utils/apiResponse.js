/**
 * Standardized API response helpers.
 * Every API response follows: { success: boolean, data?, message?, code? }
 */

class ApiResponse {
  static success(res, data = null, message = 'Success', statusCode = 200) {
    const response = { success: true, message };
    if (data !== null) response.data = data;
    return res.status(statusCode).json(response);
  }

  static created(res, data = null, message = 'Created successfully') {
    return ApiResponse.success(res, data, message, 201);
  }

  static error(res, message = 'Internal server error', statusCode = 500, code = 'INTERNAL_ERROR') {
    return res.status(statusCode).json({
      success: false,
      message,
      code,
    });
  }

  static badRequest(res, message = 'Bad request', code = 'BAD_REQUEST') {
    return ApiResponse.error(res, message, 400, code);
  }

  static unauthorized(res, message = 'Unauthorized', code = 'UNAUTHORIZED') {
    return ApiResponse.error(res, message, 401, code);
  }

  static forbidden(res, message = 'Forbidden', code = 'FORBIDDEN') {
    return ApiResponse.error(res, message, 403, code);
  }

  static notFound(res, message = 'Resource not found', code = 'NOT_FOUND') {
    return ApiResponse.error(res, message, 404, code);
  }

  static conflict(res, message = 'Conflict', code = 'CONFLICT') {
    return ApiResponse.error(res, message, 409, code);
  }

  static serviceUnavailable(res, message = 'Service temporarily unavailable', code = 'SERVICE_UNAVAILABLE') {
    return ApiResponse.error(res, message, 503, code);
  }
}

module.exports = ApiResponse;
