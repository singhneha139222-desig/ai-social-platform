const express = require('express');
const {
  getFlaggedPosts,
  getModerationDetail,
  approveContent,
  rejectContent,
  getStats,
} = require('../controllers/adminController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(auth, admin);

router.get('/stats', getStats);
router.get('/moderation/flagged', getFlaggedPosts);
router.get('/moderation/:id', getModerationDetail);
router.post('/moderation/:id/approve', approveContent);
router.post('/moderation/:id/reject', rejectContent);

module.exports = router;
