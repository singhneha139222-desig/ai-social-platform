const express = require('express');
const { createPost, getPost, deletePost, getUserPosts } = require('../controllers/postController');
const { likePost, unlikePost } = require('../controllers/interactionController');
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

// Comments
router.post('/:postId/comments', auth, commentValidation, validate, createComment);
router.get('/:postId/comments', auth, getComments);

module.exports = router;
