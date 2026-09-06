const express = require('express');
const { createPost, getPost, deletePost, getUserPosts, sharePost } = require('../controllers/postController');
const { likePost, unlikePost, savePost, unsavePost } = require('../controllers/interactionController');
const { createComment, getComments } = require('../controllers/commentController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { postValidation, commentValidation } = require('../validators');

const router = express.Router();

router.post('/', auth, postValidation, validate, createPost);
router.get('/user/:userId', auth, getUserPosts);
router.get('/:id', auth, getPost);
router.delete('/:id', auth, deletePost);

// Likes
router.post('/:id/like', auth, likePost);
router.delete('/:id/like', auth, unlikePost);

// Saves
router.post('/:id/save', auth, savePost);
router.delete('/:id/save', auth, unsavePost);

// Shares
router.post('/:id/share', auth, sharePost);

// Comments
router.post('/:postId/comments', auth, commentValidation, validate, createComment);
router.get('/:postId/comments', auth, getComments);

module.exports = router;
