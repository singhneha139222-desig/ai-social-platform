const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// All bot detection routes require admin privileges
router.use(auth);
router.use(admin);

// Trigger an async bot scan
router.post('/:userId/scan', botController.triggerScan);

// Get the latest scan results for a user
router.get('/:userId', botController.getLatestScan);

module.exports = router;
