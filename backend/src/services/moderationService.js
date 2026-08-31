const { MODERATION, MODERATION_STATUS } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Moderation Policy Module.
 * 
 * Implements the moderation decision logic based on toxicity scores.
 * This module is intentionally separated from the AI service client
 * to be independently testable.
 * 
 * Thresholds (from project specification):
 *   score <= 0.70         → PUBLISH
 *   0.70 < score <= 0.90  → FLAG for admin review
 *   score > 0.90          → REJECT immediately
 * 
 * The overall toxicity score is derived from the AI model output.
 * For unitary/toxic-bert, it is the maximum probability across all
 * toxic categories (toxic, severe_toxic, obscene, threat, insult, identity_hate).
 * This is a conservative approach: if ANY category exceeds the threshold,
 * the content is moderated accordingly.
 * 
 * This derivation method is documented here because it is a design decision
 * that should be explainable in a viva.
 */

/**
 * Determine the moderation decision based on a toxicity score.
 * @param {number} toxicityScore - Normalized score from 0 to 1
 * @returns {{ decision: string, status: string, reason: string }}
 */
function getDecision(toxicityScore) {
  if (typeof toxicityScore !== 'number' || isNaN(toxicityScore)) {
    throw new Error('Invalid toxicity score: must be a number');
  }

  if (toxicityScore < 0 || toxicityScore > 1) {
    throw new Error(`Invalid toxicity score: ${toxicityScore} is outside [0, 1]`);
  }

  if (toxicityScore > MODERATION.FLAG_THRESHOLD) {
    // score > 0.90 → reject
    return {
      decision: 'reject',
      status: MODERATION_STATUS.REJECTED,
      reason: `Toxicity score ${toxicityScore.toFixed(4)} exceeds rejection threshold (${MODERATION.FLAG_THRESHOLD})`,
    };
  }

  if (toxicityScore > MODERATION.PUBLISH_THRESHOLD) {
    // 0.70 < score <= 0.90 → flag
    return {
      decision: 'flag',
      status: MODERATION_STATUS.FLAGGED,
      reason: `Toxicity score ${toxicityScore.toFixed(4)} exceeds publish threshold (${MODERATION.PUBLISH_THRESHOLD}), flagged for admin review`,
    };
  }

  // score <= 0.70 → publish
  return {
    decision: 'publish',
    status: MODERATION_STATUS.PUBLISHED,
    reason: `Toxicity score ${toxicityScore.toFixed(4)} is within safe range`,
  };
}

/**
 * Derive the overall toxicity score from category probabilities.
 * 
 * Strategy: Maximum probability across toxic categories.
 * Rationale: Conservative — if any single category is highly toxic,
 * the content should be moderated.
 * 
 * @param {Object} categories - Map of category names to probabilities
 * @returns {number} Overall toxicity score in [0, 1]
 */
function deriveOverallScore(categories) {
  if (!categories || typeof categories !== 'object') {
    throw new Error('Invalid categories object');
  }

  const scores = Object.values(categories);
  if (scores.length === 0) {
    throw new Error('Empty categories object');
  }

  return Math.max(...scores);
}

/**
 * Full moderation pipeline: derive score + apply decision.
 * @param {Object} aiResult - Result from AI toxicity endpoint
 * @returns {{ toxicityScore, categories, decision, status, reason }}
 */
function moderate(aiResult) {
  const toxicityScore = aiResult.toxicity_score;
  const categories = aiResult.categories || {};
  const { decision, status, reason } = getDecision(toxicityScore);

  logger.info('Moderation decision:', {
    toxicityScore: toxicityScore.toFixed(4),
    decision,
    status,
    topCategory: Object.entries(categories)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none',
  });

  return { toxicityScore, categories, decision, status, reason };
}

module.exports = {
  getDecision,
  deriveOverallScore,
  moderate,
  // Expose thresholds for testing
  THRESHOLDS: { ...MODERATION },
};
