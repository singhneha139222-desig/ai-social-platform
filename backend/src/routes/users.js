const express = require('express');
const { getProfile, updateProfile, getFollowers, getFollowing, searchUsers, uploadAvatar, checkUsernameAvailability } = require('../controllers/userController');
const { followUser, unfollowUser, getFollowRequests, acceptFollowRequest, rejectFollowRequest } = require('../controllers/interactionController');
const auth = require('../middleware/auth');
const { optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const validate = require('../middleware/validate');
const { profileUpdateValidation } = require('../validators');

const router = express.Router();

router.get('/search', auth, searchUsers);
router.get('/check-username', optionalAuth, checkUsernameAvailability); // Public endpoint for registration, auth not required but handles req.user if passed
router.get('/follow-requests', auth, getFollowRequests);
router.get('/:username', optionalAuth, getProfile);
router.put('/profile', auth, profileUpdateValidation, validate, updateProfile);
router.post('/profile/avatar', auth, upload.single('avatar'), uploadAvatar);
router.get('/:username/followers', optionalAuth, getFollowers);
router.get('/:username/following', optionalAuth, getFollowing);
router.post('/:id/follow', auth, followUser);
router.delete('/:id/follow', auth, unfollowUser);
router.post('/:id/accept-follow', auth, acceptFollowRequest);
router.post('/:id/reject-follow', auth, rejectFollowRequest);

module.exports = router;
