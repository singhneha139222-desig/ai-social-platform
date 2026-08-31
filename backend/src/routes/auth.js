const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerValidation, loginValidation } = require('../validators');

const router = express.Router();

router.post('/register', authLimiter, registerValidation, validate, register);
router.post('/login', authLimiter, loginValidation, validate, login);
router.get('/me', auth, getMe);

module.exports = router;
