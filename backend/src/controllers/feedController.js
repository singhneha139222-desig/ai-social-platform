const Post = require('../models/Post');
const Interaction = require('../models/Interaction');
const ApiResponse = require('../utils/apiResponse');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { PUBLIC_STATUSES } = require('../utils/constants');
const recommendationService = require('../services/recommendationService');
const feedCache = require('../services/feedCacheService');

/**
 * GET /api/v1/feed
 * Personalized feed: posts from followed users + recommended posts,
 * sorted by recommendation score.
 * Never shows rejected/flagged/removed content.
 */
async function getFeed(req, res, next) {
  const start_total = Date.now();
  const feedMetrics = {};
  try {
    const userId = req.user._id;
    const { page, limit } = parsePagination(req.query);

    // Cache lookup
    const cachedFeed = feedCache.get(userId.toString(), page, limit);
    if (cachedFeed) {
      feedMetrics.total_ms = Date.now() - start_total;
      console.log(`[FeedMetric] cache_hits=1 cache_misses=0 total_ms=${feedMetrics.total_ms}`);
      return ApiResponse.success(res, cachedFeed);
    }

    // Get posts from followed users
    const followInteractions = await Interaction.find({
      user: userId,
      type: 'follow',
    }).lean();
    const followedUserIds = followInteractions.map((f) => f.targetUser);

    // Get followed users' published posts
    const followedPosts = await Post.find({
      author: { $in: followedUserIds },
      moderationStatus: { $in: PUBLIC_STATUSES },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('author', 'username displayName avatar')
      .lean();
    feedMetrics.follow_db_ms = Date.now() - start_total;

    // Get recommended posts
    const start_rec = Date.now();
    const recommendations = await recommendationService.getRecommendations(userId, {
      page: 1,
      limit: 50,
    });
    feedMetrics.recommendation_ms = Date.now() - start_rec;
    const recMetrics = recommendations.metrics || {};

    // Merge and deduplicate
    const start_merge = Date.now();
    const seen = new Set();
    const allPosts = [];

    // Add followed posts with a boost
    for (const post of followedPosts) {
      const id = post._id.toString();
      if (!seen.has(id)) {
        seen.add(id);
        allPosts.push({
          ...post,
          recommendationScore: (post.recommendationScore || 0.5) + 0.2,
          source: 'following',
        });
      }
    }

    // Add recommended posts
    for (const post of recommendations.posts) {
      const id = post._id.toString();
      if (!seen.has(id)) {
        seen.add(id);
        allPosts.push({ ...post, source: 'recommended' });
      }
    }

    // If still few posts, add recent popular posts
    if (allPosts.length < limit) {
      const fillerPosts = await Post.find({
        moderationStatus: { $in: PUBLIC_STATUSES },
        _id: { $nin: Array.from(seen) },
        author: { $ne: userId },
      })
        .sort({ likesCount: -1, createdAt: -1 })
        .limit(limit - allPosts.length)
        .populate('author', 'username displayName avatar')
        .lean();

      for (const post of fillerPosts) {
        allPosts.push({ ...post, recommendationScore: 0.1, source: 'popular' });
      }
    }

    // Sort by recommendation score
    allPosts.sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));
    feedMetrics.merge_ms = Date.now() - start_merge;

    // Check which posts the user has liked
    const start_serialization = Date.now();
    const postIds = allPosts.map((p) => p._id);
    const userLikes = await Interaction.find({
      user: userId,
      post: { $in: postIds },
      type: 'like',
    }).lean();
    const likedPostIds = new Set(userLikes.map((l) => l.post.toString()));

    const postsWithLikeStatus = allPosts.map((p) => ({
      ...p,
      isLiked: likedPostIds.has(p._id.toString()),
    }));

    // Paginate
    const start = (page - 1) * limit;
    const paged = postsWithLikeStatus.slice(start, start + limit);
    
    feedMetrics.serialization_ms = Date.now() - start_serialization;
    feedMetrics.total_ms = Date.now() - start_total;
    
    // Output precisely as requested for profiling
    console.log(`[FeedMetric]
candidate_db_ms=${recMetrics.candidate_db_ms || 0}
interaction_db_ms=${recMetrics.interaction_db_ms || 0}
collaborative_ms=${recMetrics.collaborative_ms || 0}
content_similarity_ms=${recMetrics.content_similarity_ms || 0}
ranking_ms=${(recMetrics.ranking_ms || 0) + feedMetrics.merge_ms}
serialization_ms=${feedMetrics.serialization_ms}
total_ms=${feedMetrics.total_ms}
candidate_count=${recMetrics.candidate_count || 0}
interaction_count=${recMetrics.interaction_count || 0}
cache_hits=0
cache_misses=1`);

    const responseData = {
      posts: paged,
      pagination: buildPaginationMeta(postsWithLikeStatus.length, page, limit),
    };
    
    // Save to cache
    feedCache.set(userId.toString(), page, limit, responseData);

    return ApiResponse.success(res, responseData);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/explore
 * Discover new content: recent published posts not from followed users.
 */
async function getExplore(req, res, next) {
  try {
    const userId = req.user._id;
    const { page, limit, skip } = parsePagination(req.query);

    const filter = {
      moderationStatus: { $in: PUBLIC_STATUSES },
      author: { $ne: userId },
    };

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username displayName avatar'),
      Post.countDocuments(filter),
    ]);

    // Check likes
    const postIds = posts.map((p) => p._id);
    const userLikes = await Interaction.find({
      user: userId,
      post: { $in: postIds },
      type: 'like',
    }).lean();
    const likedPostIds = new Set(userLikes.map((l) => l.post.toString()));

    const postsWithLikeStatus = posts.map((p) => ({
      ...p.toJSON(),
      isLiked: likedPostIds.has(p._id.toString()),
    }));

    return ApiResponse.success(res, {
      posts: postsWithLikeStatus,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/recommendations
 */
async function getRecommendations(req, res, next) {
  try {
    const userId = req.user._id;
    const { page, limit } = parsePagination(req.query);

    const result = await recommendationService.getRecommendations(userId, { page, limit });

    return ApiResponse.success(res, {
      posts: result.posts,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getFeed, getExplore, getRecommendations };
