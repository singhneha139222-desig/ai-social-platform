const express = require('express');
const { requestRegistrationOtp, register, login, getMe, forgotPassword, resetPassword } = require('../controllers/authController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { requestRegistrationOtpValidation, registerValidation, loginValidation, forgotPasswordValidation, resetPasswordValidation } = require('../validators');

const router = express.Router();

router.post('/request-otp', authLimiter, requestRegistrationOtpValidation, validate, requestRegistrationOtp);
router.post('/register', authLimiter, registerValidation, validate, register);
router.post('/login', authLimiter, loginValidation, validate, login);
router.post('/forgot-password', authLimiter, forgotPasswordValidation, validate, forgotPassword);
router.post('/reset-password/:token', authLimiter, resetPasswordValidation, validate, resetPassword);
router.get('/me', auth, getMe);

module.exports = router;
