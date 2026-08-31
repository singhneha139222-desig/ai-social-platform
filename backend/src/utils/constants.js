/**
 * Constants for the AI Social Platform.
 * All magic numbers and configurable values are centralized here.
 */

// Moderation thresholds — used by the moderation policy module
const MODERATION = {
  PUBLISH_THRESHOLD: 0.70,  // score <= 0.70 → publish
  FLAG_THRESHOLD: 0.90,     // 0.70 < score <= 0.90 → flag for admin review
  // score > 0.90 → reject immediately
};

// Moderation statuses
const MODERATION_STATUS = {
  PENDING: 'pending',
  PUBLISHED: 'published',
  FLAGGED: 'flagged',
  REJECTED: 'rejected',
  REMOVED: 'removed',
  APPROVED_BY_ADMIN: 'approved_by_admin',
  REJECTED_BY_ADMIN: 'rejected_by_admin',
};

// Statuses that are visible in public feeds
const PUBLIC_STATUSES = [
  MODERATION_STATUS.PUBLISHED,
  MODERATION_STATUS.APPROVED_BY_ADMIN,
];

// Recommendation weights (configurable)
const RECOMMENDATION_WEIGHTS = {
  CONTENT: 0.25,       // α — content similarity (TF-IDF cosine)
  COLLABORATIVE: 0.25, // β — collaborative filtering signal
  ENGAGEMENT: 0.20,    // γ — normalized engagement metrics
  RECENCY: 0.20,       // δ — time decay
  SENTIMENT: 0.10,     // ε — sentiment quality signal
};

// Recommendation config
const RECOMMENDATION_CONFIG = {
  CANDIDATE_LIMIT: 200,       // max candidates to score
  RESULTS_PER_PAGE: 20,       // default page size
  RECENCY_HALF_LIFE_HOURS: 24, // time decay half-life
  COLD_START_THRESHOLD: 5,    // interactions below this = cold start
  MIN_ENGAGEMENT_FOR_POPULAR: 3, // minimum likes+comments to be "popular"
};

// Interaction types
const INTERACTION_TYPES = {
  LIKE: 'like',
  COMMENT: 'comment',
  FOLLOW: 'follow',
  VIEW: 'view',
};

// Notification types
const NOTIFICATION_TYPES = {
  FOLLOW: 'follow',
  LIKE: 'like',
  COMMENT: 'comment',
  MODERATION: 'moderation',
};

// User roles
const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Content limits
const CONTENT_LIMITS = {
  POST_MAX_LENGTH: 2000,
  POST_MIN_LENGTH: 1,
  COMMENT_MAX_LENGTH: 1000,
  COMMENT_MIN_LENGTH: 1,
  BIO_MAX_LENGTH: 500,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  PASSWORD_MIN_LENGTH: 6,
};

module.exports = {
  MODERATION,
  MODERATION_STATUS,
  PUBLIC_STATUSES,
  RECOMMENDATION_WEIGHTS,
  RECOMMENDATION_CONFIG,
  INTERACTION_TYPES,
  NOTIFICATION_TYPES,
  ROLES,
  PAGINATION,
  CONTENT_LIMITS,
};
