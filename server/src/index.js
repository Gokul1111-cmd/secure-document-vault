const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { loadKeys } = require('./services/encryption.service');
const { initializeFirebase } = require('./services/storage.service');

loadKeys();
logger.info('RSA keys loaded successfully');

initializeFirebase();

const server = app.listen(env.port, () => {
  logger.info(`API server listening on port ${env.port}`);
});

const gracefulShutdown = (signal) => {
  logger.warn(`${signal} received. Shutting down gracefully.`);
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forcing shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
};

['SIGTERM', 'SIGINT'].forEach((signal) => {
  process.on(signal, () => gracefulShutdown(signal));
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`, { stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
});
