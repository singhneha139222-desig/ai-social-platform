const app = require('./app');
const connectDB = require('./config/db');
const config = require('./config/env');
const logger = require('./utils/logger');

async function startServer() {
  try {
    await connectDB();

    app.listen(config.port, () => {
      logger.info(`Backend server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`AI Service URL: ${config.aiServiceUrl}`);
      logger.info(`Client URL: ${config.clientUrl}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
