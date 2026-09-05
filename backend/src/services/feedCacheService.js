/**
 * In-memory LRU cache for user feeds.
 */
class FeedCache {
  constructor(maxSize = 1000, ttlMs = 30000) { // 30 seconds default
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  get(userId, page, limit) {
    const key = `${userId}:${page}:${limit}`;
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(userId, page, limit, data) {
    if (this.cache.size >= this.maxSize) {
      // Evict oldest (Map iterates in insertion order)
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    const key = `${userId}:${page}:${limit}`;
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Invalidate all cached pages for a specific user
  invalidateUser(userId) {
    const prefix = `${userId}:`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  // Global invalidation when a public post is created/deleted/moderated
  // A simplistic approach is to clear everything, as global events affect many feeds.
  // In a real distributed system, we'd use Redis pub/sub. For FYP, this is safe and bounded.
  invalidateGlobal() {
    this.cache.clear();
  }
}

const feedCache = new FeedCache(500, 30000); // Max 500 users, 30s TTL

module.exports = feedCache;
