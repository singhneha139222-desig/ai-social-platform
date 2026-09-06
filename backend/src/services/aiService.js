const axios = require('axios');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * AI Service Client.
 * Communicates with the Python Flask AI service for toxicity and sentiment analysis.
 * 
 * IMPORTANT: If the AI service is unavailable, methods throw errors.
 * The caller (moderation service) must handle these errors and NEVER silently publish content.
 */
class AIServiceClient {
  constructor() {
    this.client = axios.create({
      baseURL: config.aiServiceUrl,
      timeout: 30000, // 30s timeout — model inference can be slow on CPU
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Analyze text for toxicity.
   * @param {string} text - The text to analyze
   * @returns {Object} { toxicity_score, categories, decision, model }
   * @throws {Error} If AI service is unavailable
   */
  async analyzeToxicity(text) {
    try {
      const response = await this.client.post('/api/v1/moderation/toxicity', { text });
      return response.data;
    } catch (error) {
      logger.error('AI toxicity service error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
      });
      throw new Error('AI moderation service is unavailable');
    }
  }

  /**
   * Analyze text for sentiment.
   * @param {string} text - The text to analyze
   * @returns {Object} { label, score }
   * @throws {Error} If AI service is unavailable
   */
  async analyzeSentiment(text) {
    try {
      const response = await this.client.post('/api/v1/sentiment', { text });
      return response.data;
    } catch (error) {
      logger.error('AI sentiment service error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
      });
      throw new Error('AI sentiment service is unavailable');
    }
  }

  /**
   * Analyze image for NSFW content.
   * @param {string} imagePath - Absolute path to the image
   * @returns {Object} { toxicity_score, categories, decision, model }
   */
  async analyzeImage(imagePath) {
    try {
      const response = await this.client.post('/api/v1/moderation/image', { path: imagePath });
      return response.data;
    } catch (error) {
      logger.error('AI image service error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
      });
      throw new Error('AI image moderation service is unavailable');
    }
  }

  /**
   * Analyze video for NSFW content using frame extraction.
   * @param {string} videoPath - Absolute path to the video
   * @returns {Object} { toxicity_score, categories, decision, model }
   */
  async analyzeVideo(videoPath) {
    try {
      // Increase timeout for video as it requires frame extraction (60s)
      const response = await this.client.post('/api/v1/moderation/video', { path: videoPath }, { timeout: 60000 });
      return response.data;
    } catch (error) {
      logger.error('AI video service error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
      });
      throw new Error('AI video moderation service is unavailable');
    }
  }

  /**
   * Run GNN bot detection for a given user.
   * @param {string} userId - The target user's ObjectId string
   * @returns {Object} Result of GNN inference
   */
  async analyzeBotDetection(userId) {
    try {
      const response = await this.client.post('/api/v1/moderation/bot-detect', { userId });
      return response.data;
    } catch (error) {
      logger.error('AI bot detection service error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
      });
      throw new Error('AI bot detection service is unavailable');
    }
  }

  /**
   * Check AI service health.
   * @returns {boolean}
   */
  async checkHealth() {
    try {
      const response = await this.client.get('/health');
      return response.data?.status === 'healthy';
    } catch {
      return false;
    }
  }
}

module.exports = new AIServiceClient();
