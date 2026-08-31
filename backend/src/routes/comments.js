const express = require('express');
const { deleteComment } = require('../controllers/commentController');
const auth = require('../middleware/auth');

const router = express.Router();

router.delete('/:id', auth, deleteComment);

module.exports = router;
