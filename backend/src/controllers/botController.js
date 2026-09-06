const BotDetection = require('../models/BotDetection');
const User = require('../models/User');
const aiService = require('../services/aiService');
const logger = require('../utils/logger');
const { getIo } = require('../utils/socket');

/**
 * Triggers a Bot Detection Scan
 * Usually called via Admin dashboard or high-activity trigger (async)
 */
exports.triggerScan = async (req, res) => {
  const { userId } = req.params;

  try {
    // Basic validations
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Cooldown check (prevent multiple scans within 24h unless forced)
    const force = req.query.force === 'true';
    if (!force) {
      const recentScan = await BotDetection.findOne({ userId }).sort({ createdAt: -1 });
      if (recentScan && (Date.now() - recentScan.createdAt.getTime()) < 24 * 60 * 60 * 1000) {
        return res.status(429).json({ 
          success: false, 
          message: 'User was scanned recently. Use force=true to bypass cooldown.',
          data: recentScan
        });
      }
    }

    // Return immediate 202 Accepted so we don't block the caller
    res.status(202).json({ success: true, message: 'Bot scan initiated asynchronously' });

    // --- ASYNC EXECUTION ---
    // Create pending record
    const record = await BotDetection.create({ userId, status: 'pending' });

    try {
      // Call Flask AI Service
      const result = await aiService.analyzeBotDetection(userId);
      
      // Update record based on result
      if (result.status === 'insufficient_data') {
        record.status = 'completed';
        record.riskLevel = 'insufficient_data';
      } else if (result.status === 'success') {
        record.status = 'completed';
        record.botProbability = result.botProbability;
        record.riskLevel = result.riskLevel;
        record.modelVersion = result.modelVersion;
        record.featuresUsed = result.behavioralSignals;
        record.evaluationDurationMs = result.inferenceTimeMs;
      } else {
        record.status = 'failed';
        record.errorCode = result.message || 'Unknown error';
      }
    } catch (aiError) {
      logger.error(`AI service failed during bot detection for user ${userId}`, aiError);
      record.status = 'failed';
      record.errorCode = 'AI_SERVICE_UNAVAILABLE';
    }

    await record.save();

    // Emit Socket.IO event to admins only
    const io = getIo();
    io.to('admin').emit('bot_detection:update', {
      userId,
      scanResult: record
    });

  } catch (error) {
    logger.error('Error triggering bot scan:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
};

/**
 * Gets the latest bot detection scan for a user (Admin only)
 */
exports.getLatestScan = async (req, res) => {
  try {
    const scan = await BotDetection.findOne({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: scan });
  } catch (error) {
    logger.error('Error fetching bot scan:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
