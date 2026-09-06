const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  markAsRead,
  acceptRequest,
  deleteConversation
} = require('../controllers/messageController');

// All message routes require authentication
router.use(auth);

router
  .route('/conversations')
  .get(getConversations)
  .post(createConversation);

router
  .route('/conversations/:conversationId')
  .get(getMessages)
  .delete(deleteConversation);

router
  .route('/conversations/:conversationId/messages')
  .post(sendMessage);

router
  .route('/conversations/:conversationId/read')
  .patch(markAsRead);

router
  .route('/conversations/:conversationId/accept')
  .patch(acceptRequest);

module.exports = router;
