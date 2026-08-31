const express = require('express');
const { getFeed, getExplore, getRecommendations } = require('../controllers/feedController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/feed', auth, getFeed);
router.get('/explore', auth, getExplore);
router.get('/recommendations', auth, getRecommendations);

module.exports = router;
