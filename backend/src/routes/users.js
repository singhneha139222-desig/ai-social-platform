const express = require('express');
const { getProfile, updateProfile, getFollowers, getFollowing, searchUsers } = require('../controllers/userController');
const { followUser, unfollowUser } = require('../controllers/interactionController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { profileUpdateValidation } = require('../validators');

const router = express.Router();

router.get('/search', auth, searchUsers);
router.get('/:username', auth, getProfile);
router.put('/profile', auth, profileUpdateValidation, validate, updateProfile);
router.get('/:username/followers', auth, getFollowers);
router.get('/:username/following', auth, getFollowing);
router.post('/:id/follow', auth, followUser);
router.delete('/:id/follow', auth, unfollowUser);

module.exports = router;
