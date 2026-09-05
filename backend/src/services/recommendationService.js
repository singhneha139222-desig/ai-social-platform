const Post = require('../models/Post');
const Interaction = require('../models/Interaction');
const logger = require('../utils/logger');
const {
  RECOMMENDATION_WEIGHTS,
  RECOMMENDATION_CONFIG,
  PUBLIC_STATUSES,
  INTERACTION_TYPES,
} = require('../utils/constants');

/**
 * Hybrid Recommendation Engine
 * 
 * Computes a final recommendation score for each candidate post using:
 * 
 *   final_score = α × content_score
 *               + β × collaborative_score
 *               + γ × engagement_score
 *               + δ × recency_score
 *               + ε × sentiment_score
 * 
 * All individual component scores are normalized to [0, 1] before combination.
 * Weights are configurable via constants.js.
 * 
 * ## Component Details
 * 
 * ### Content Score (α = 0.25)
 * TF-IDF-inspired cosine similarity between user interest profile and post content.
 * User interest profile = aggregated word frequencies from posts the user has liked.
 * Post representation = word frequencies of the post content.
 * Similarity = cosine(user_profile, post_representation).
 * 
 * ### Collaborative Score (β = 0.25)
 * User-based collaborative filtering via Jaccard similarity.
 * For each candidate post, find users who liked it.
 * Compute Jaccard similarity between the current user's "liked posts" set
 * and each of those users' "liked posts" sets.
 * The collaborative score = mean Jaccard similarity across likers.
 * This captures "users with similar taste liked this post."
 * 
 * ### Engagement Score (γ = 0.20)
 * Normalized engagement = (likesCount + commentsCount) / maxEngagement across candidates.
 * Capped at 1.0.
 * 
 * ### Recency Score (δ = 0.20)
 * Exponential time decay: recency = exp(-λ × hours_since_post)
 * where λ = ln(2) / RECENCY_HALF_LIFE_HOURS.
 * A post at the half-life age scores 0.5.
 * 
 * ### Sentiment Score (ε = 0.10)
 * Small boost for positive sentiment content: positive=1.0, neutral=0.5, negative=0.2.
 * This encourages safe, constructive content without over-filtering.
 * 
 * ## Cold-Start Strategy
 * - New user (< COLD_START_THRESHOLD interactions): Skip content and collaborative
 *   scores. Serve recent popular published posts sorted by engagement × recency.
 * - New post (< 3 interactions): Rely on content similarity and recency.
 * 
 * ## Safety
 * Only posts with moderationStatus ∈ PUBLIC_STATUSES are candidates.
 */

const { wordFrequency } = require('../utils/textProcessing');

/**
 * Cosine similarity between two word frequency maps.
 * Returns value in [0, 1].
 */
function cosineSimilarity(vecA, vecB) {
  const keysA = Object.keys(vecA);
  if (keysA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  const allKeys = new Set([...keysA, ...Object.keys(vecB)]);
  for (const key of allKeys) {
    const a = vecA[key] || 0;
    const b = vecB[key] || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Jaccard similarity between two sets.
 */
function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// --- Score computation functions ---

function computeRecencyScore(postDate) {
  const hoursAgo = (Date.now() - new Date(postDate).getTime()) / (1000 * 60 * 60);
  const lambda = Math.LN2 / RECOMMENDATION_CONFIG.RECENCY_HALF_LIFE_HOURS;
  return Math.exp(-lambda * hoursAgo);
}

function computeEngagementScore(post, maxEngagement) {
  if (maxEngagement === 0) return 0;
  const engagement = (post.likesCount || 0) + (post.commentsCount || 0);
  return Math.min(engagement / maxEngagement, 1.0);
}

function computeSentimentScore(sentiment) {
  const sentimentScores = {
    positive: 1.0,
    neutral: 0.5,
    negative: 0.2,
  };
  return sentimentScores[sentiment] || 0.5;
}

// --- Main recommendation function ---

/**
/**
 * Generate personalized recommendations for a user.
 * @param {string} userId - The user requesting recommendations
 * @param {Object} options - { page, limit, excludePostIds }
 * @returns {{ posts: Array, pagination: Object, metrics: Object }}
 */
async function getRecommendations(userId, options = {}) {
  const {
    page = 1,
    limit = RECOMMENDATION_CONFIG.RESULTS_PER_PAGE,
    excludePostIds = [],
  } = options;

  const userIdStr = userId.toString();

  // 1. Get user's interaction history
  const startInteractionDb = Date.now();
  const userInteractions = await Interaction.find({
    user: userId,
    type: { $in: [INTERACTION_TYPES.LIKE, INTERACTION_TYPES.COMMENT] },
    post: { $ne: null },
  }).populate('post').lean();
  let interactionDbMs = Date.now() - startInteractionDb;

  const userLikedPostIds = new Set(
    userInteractions
      .filter((i) => i.type === INTERACTION_TYPES.LIKE && i.post)
      .map((i) => i.post._id.toString())
  );

  const isNewUser = userInteractions.length < RECOMMENDATION_CONFIG.COLD_START_THRESHOLD;

  // 2. Get users the current user follows
  const followInteractions = await Interaction.find({
    user: userId,
    type: INTERACTION_TYPES.FOLLOW,
  }).lean();
  const followedUserIds = followInteractions.map((i) => i.targetUser);

  // 3. Get candidate posts (published/approved, not the user's own, not already interacted)
  const startCandidateDb = Date.now();
  const excludeIds = [...excludePostIds, ...Array.from(userLikedPostIds)];
  const candidates = await Post.find({
    moderationStatus: { $in: PUBLIC_STATUSES },
    author: { $ne: userId },
    _id: { $nin: excludeIds },
  })
    .select('author content likesCount commentsCount createdAt sentiment wordFrequencies _id')
    .sort({ createdAt: -1 })
    .limit(RECOMMENDATION_CONFIG.CANDIDATE_LIMIT)
    .populate('author', 'username displayName avatar')
    .lean();
  const candidateDbMs = Date.now() - startCandidateDb;

  const metricsTemplate = {
    candidate_db_ms: candidateDbMs,
    interaction_db_ms: interactionDbMs,
    collaborative_ms: 0,
    content_similarity_ms: 0,
    ranking_ms: 0,
    candidate_count: candidates.length,
    interaction_count: 0
  };

  if (candidates.length === 0) {
    return { posts: [], pagination: { total: 0, page, limit, totalPages: 0 }, metrics: metricsTemplate };
  }

  // 4. Compute max engagement for normalization
  const maxEngagement = Math.max(
    ...candidates.map((p) => (p.likesCount || 0) + (p.commentsCount || 0)),
    1
  );

  // 5. For cold-start users, return popular recent posts
  if (isNewUser) {
    logger.info('Cold-start recommendation for user', { userId: userIdStr });
    const scored = candidates.map((post) => {
      const recency = computeRecencyScore(post.createdAt);
      const engagement = computeEngagementScore(post, maxEngagement);
      const sentiment = computeSentimentScore(post.sentiment);
      // Cold-start formula: heavier on recency and engagement
      const score = 0.40 * engagement + 0.45 * recency + 0.15 * sentiment;
      return { ...post, recommendationScore: score };
    });

    const startRanking = Date.now();
    scored.sort((a, b) => b.recommendationScore - a.recommendationScore);
    const start = (page - 1) * limit;
    const paged = scored.slice(start, start + limit);
    metricsTemplate.ranking_ms = Date.now() - startRanking;

    return {
      posts: paged,
      pagination: {
        total: scored.length,
        page,
        limit,
        totalPages: Math.ceil(scored.length / limit),
      },
      metrics: metricsTemplate
    };
  }

  // 6. Build user interest profile (word frequencies from liked posts)
  const likedPosts = await Post.find({
    _id: { $in: Array.from(userLikedPostIds) },
  })
    .select('content wordFrequencies')
    .lean();

  const userProfile = {};
  for (const lp of likedPosts) {
    // Phase 4/7: Use precomputed wordFrequencies if they exist to avoid dynamic processing
    const freq = (lp.wordFrequencies && Object.keys(lp.wordFrequencies).length > 0)
      ? lp.wordFrequencies
      : wordFrequency(lp.content);
      
    for (const [word, count] of Object.entries(freq)) {
      userProfile[word] = (userProfile[word] || 0) + count;
    }
  }

  // 7. Build collaborative context: for each candidate, find who liked it
  const startCollabDb = Date.now();
  const candidateIds = candidates.map((c) => c._id);
  
  // OPTIMIZATION: Use MongoDB aggregation to find the top 30 unique users who have liked 
  // the current candidate posts. This prevents pulling thousands of Interaction documents into Node.js memory.
  const topLikersAgg = await Interaction.aggregate([
    { $match: { post: { $in: candidateIds }, type: INTERACTION_TYPES.LIKE, user: { $ne: userId } } },
    { $group: { _id: '$user', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 30 }
  ]);
  
  const uniqueLikerIds = topLikersAgg.map(u => u._id);

  // Get all liked posts for these specific top likers to compute Jaccard similarity
  // We project only the necessary fields (user and post)
  const likerInteractions = await Interaction.find({
    user: { $in: uniqueLikerIds },
    type: INTERACTION_TYPES.LIKE,
    post: { $ne: null },
  }).lean();
  
  metricsTemplate.interaction_count = likerInteractions.length;
  metricsTemplate.collaborative_ms = Date.now() - startCollabDb;

  const likerProfiles = {};
  for (const interaction of likerInteractions) {
    const uid = interaction.user.toString();
    if (!likerProfiles[uid]) likerProfiles[uid] = new Set();
    likerProfiles[uid].add(interaction.post.toString());
  }

  // OPTIMIZATION: Use precomputed wordFrequencies or local cache for dynamic ones
  const freqCache = new Map();
  const getFreq = (post) => {
    if (post.wordFrequencies && Object.keys(post.wordFrequencies).length > 0) {
      return post.wordFrequencies;
    }
    const content = post.content || '';
    if (freqCache.has(content)) return freqCache.get(content);
    if (freqCache.size > 1000) freqCache.clear();
    const res = wordFrequency(content);
    freqCache.set(content, res);
    return res;
  };

  const startComp = Date.now();
  // 8. Score each candidate
  const weights = RECOMMENDATION_WEIGHTS;
  const scored = candidates.map((post) => {
    const postId = post._id.toString();
    const postVec = getFreq(post);

    // Content score: cosine similarity between user profile and post
    const contentScore = cosineSimilarity(userProfile, postVec);

    // Collaborative score: mean Jaccard similarity with likers of this post
    // Since we aggregated top likers globally across candidates, we check which of those likers liked THIS post
    let collaborativeScore = 0;
    const likers = uniqueLikerIds.filter(likerId => {
      const set = likerProfiles[likerId.toString()];
      return set && set.has(postId);
    });
    
    if (likers.length > 0) {
      let totalJaccard = 0;
      for (const likerId of likers) {
        const likerSet = likerProfiles[likerId.toString()] || new Set();
        totalJaccard += jaccardSimilarity(userLikedPostIds, likerSet);
      }
      collaborativeScore = totalJaccard / likers.length;
    }

    // Boost posts from followed users
    const isFollowed = followedUserIds.some(
      (fid) => fid.toString() === post.author._id.toString()
    );
    if (isFollowed) {
      collaborativeScore = Math.min(collaborativeScore + 0.3, 1.0);
    }

    // Engagement score
    const engagementScore = computeEngagementScore(post, maxEngagement);

    // Recency score
    const recencyScore = computeRecencyScore(post.createdAt);

    // Sentiment score
    const sentimentScore = computeSentimentScore(post.sentiment);

    // Final hybrid score
    const finalScore =
      weights.CONTENT * contentScore +
      weights.COLLABORATIVE * collaborativeScore +
      weights.ENGAGEMENT * engagementScore +
      weights.RECENCY * recencyScore +
      weights.SENTIMENT * sentimentScore;

    return {
      ...post,
      recommendationScore: finalScore,
      _scoreBreakdown: {
        content: contentScore,
        collaborative: collaborativeScore,
        engagement: engagementScore,
        recency: recencyScore,
        sentiment: sentimentScore,
      },
    };
  });
  // 9. Sort by final score descending
  const startRanking = Date.now();
  scored.sort((a, b) => b.recommendationScore - a.recommendationScore);

  // 10. Paginate
  const start = (page - 1) * limit;
  const paged = scored.slice(start, start + limit);
  
  metricsTemplate.ranking_ms = Date.now() - startRanking;
  metricsTemplate.content_similarity_ms = Date.now() - startComp - metricsTemplate.ranking_ms;

  return {
    posts: paged,
    pagination: {
      total: scored.length,
      page,
      limit,
      totalPages: Math.ceil(scored.length / limit),
    },
    metrics: metricsTemplate
  };
}

module.exports = {
  getRecommendations,
  // Exported for testing
  wordFrequency,
  cosineSimilarity,
  jaccardSimilarity,
  computeRecencyScore,
  computeEngagementScore,
  computeSentimentScore,
};
