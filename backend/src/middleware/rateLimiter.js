const rateLimit = require('express-rate-limit');

// Return a dummy middleware if rate limiting is disabled
const dummyLimiter = (req, res, next) => next();

const authLimiter = process.env.DISABLE_RATE_LIMIT === 'true' 
  ? dummyLimiter 
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      message: { success: false, message: 'Too many requests' },
      standardHeaders: true,
      legacyHeaders: false,
    });

const apiLimiter = process.env.DISABLE_RATE_LIMIT === 'true' 
  ? dummyLimiter 
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      message: { success: false, message: 'Too many requests' },
      standardHeaders: true,
      legacyHeaders: false,
    });

module.exports = { authLimiter, apiLimiter };
