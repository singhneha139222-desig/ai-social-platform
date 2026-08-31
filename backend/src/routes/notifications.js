const express = require('express');
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, getNotifications);
router.put('/read-all', auth, markAllAsRead);
router.put('/:id/read', auth, markAsRead);

module.exports = router;
