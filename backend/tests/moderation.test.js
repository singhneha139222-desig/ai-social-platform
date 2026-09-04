/**
 * Moderation Service Tests.
 * Tests the policy engine that maps toxicity scores to moderation decisions.
 */

const moderationService = require('../src/services/moderationService');
const { MODERATION, MODERATION_STATUS } = require('../src/utils/constants');

describe('ModerationService — getDecision', () => {
  it('should return "publish" for safe content (toxicity <= 0.70)', () => {
    const result = moderationService.getDecision(0.15);
    expect(result.decision).toBe('publish');
    expect(result.status).toBe(MODERATION_STATUS.PUBLISHED);
  });

  it('should return "flag" for borderline content (0.70 < toxicity <= 0.90)', () => {
    const result = moderationService.getDecision(0.82);
    expect(result.decision).toBe('flag');
    expect(result.status).toBe(MODERATION_STATUS.FLAGGED);
  });

  it('should return "reject" for toxic content (toxicity > 0.90)', () => {
    const result = moderationService.getDecision(0.95);
    expect(result.decision).toBe('reject');
    expect(result.status).toBe(MODERATION_STATUS.REJECTED);
  });

  it('should publish at exactly 0.70 (threshold is > 0.70)', () => {
    const result = moderationService.getDecision(0.70);
    expect(result.decision).toBe('publish');
  });

  it('should flag at exactly 0.90 (threshold is > 0.90 for reject)', () => {
    const result = moderationService.getDecision(0.90);
    expect(result.decision).toBe('flag');
  });

  it('should reject at 0.91', () => {
    const result = moderationService.getDecision(0.91);
    expect(result.decision).toBe('reject');
  });

  it('should publish at 0.00', () => {
    const result = moderationService.getDecision(0.00);
    expect(result.decision).toBe('publish');
  });

  it('should throw for NaN', () => {
    expect(() => moderationService.getDecision(NaN)).toThrow('Invalid toxicity score');
  });

  it('should throw for out-of-range scores', () => {
    expect(() => moderationService.getDecision(-0.1)).toThrow();
    expect(() => moderationService.getDecision(1.1)).toThrow();
  });

  it('should include a human-readable reason', () => {
    const result = moderationService.getDecision(0.85);
    expect(result.reason).toContain('0.8500');
    expect(result.reason).toContain('flagged for admin review');
  });
});

describe('ModerationService — deriveOverallScore', () => {
  it('should return max across categories', () => {
    const score = moderationService.deriveOverallScore({
      toxic: 0.15, severe_toxic: 0.01, obscene: 0.80,
      threat: 0.01, insult: 0.03, identity_hate: 0.01,
    });
    expect(score).toBe(0.80);
  });

  it('should throw for empty categories', () => {
    expect(() => moderationService.deriveOverallScore({})).toThrow('Empty categories');
  });

  it('should throw for null', () => {
    expect(() => moderationService.deriveOverallScore(null)).toThrow('Invalid categories');
  });
});

describe('ModerationService — moderate (full pipeline)', () => {
  it('should process a full AI response', () => {
    const result = moderationService.moderate({
      toxicity_score: 0.15,
      categories: {
        toxic: 0.15, severe_toxic: 0.01, obscene: 0.02,
        threat: 0.01, insult: 0.03, identity_hate: 0.01,
      },
      decision: 'publish',
    });

    expect(result.decision).toBe('publish');
    expect(result.toxicityScore).toBe(0.15);
    expect(result.categories.toxic).toBe(0.15);
  });
});

describe('Threshold Configuration', () => {
  it('should have PUBLISH_THRESHOLD at 0.70', () => {
    expect(MODERATION.PUBLISH_THRESHOLD).toBe(0.70);
  });

  it('should have FLAG_THRESHOLD at 0.90', () => {
    expect(MODERATION.FLAG_THRESHOLD).toBe(0.90);
  });

  it('should have PUBLISH < FLAG', () => {
    expect(MODERATION.PUBLISH_THRESHOLD).toBeLessThan(MODERATION.FLAG_THRESHOLD);
  });
});
