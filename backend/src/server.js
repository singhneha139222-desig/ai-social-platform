const http = require('http');
const { startEventLoopMonitor } = require('./utils/eventLoopMonitor');
const app = require('./app');
const connectDB = require('./config/db');
const config = require('./config/env');
const logger = require('./utils/logger');
const { initSocket } = require('./utils/socket');

startEventLoopMonitor();

async function startServer() {
  try {
    await connectDB();

    const server = http.createServer(app);
    initSocket(server);

    server.listen(config.port, () => {
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
