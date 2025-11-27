import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const app = require('../server/src/app');
const logger = require('../server/src/utils/logger');
const { loadKeys } = require('../server/src/services/encryption.service');
const { initializeFirebase } = require('../server/src/services/storage.service');

try {
  loadKeys();
  logger.info('RSA keys loaded for serverless runtime');
} catch (error) {
  logger.error('Failed to load RSA keys', { message: error.message });
  throw error;
}

initializeFirebase();

export default app;
