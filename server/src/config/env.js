const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const getEnv = (key, fallback) => {
  if (process.env[key] && process.env[key].length > 0) {
    return process.env[key];
  }
  return fallback;
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

module.exports = {
  nodeEnv: getEnv('NODE_ENV', 'development'),
  port: toNumber(getEnv('PORT', '5000'), 5000),
  clientOrigin: getEnv('CLIENT_ORIGIN', 'http://localhost:5173'),
  rateLimitWindowMs: toNumber(getEnv('RATE_LIMIT_WINDOW', '15'), 15) * 60 * 1000,
  rateLimitMax: toNumber(getEnv('RATE_LIMIT_MAX', '100'), 100),
  jwtAccessSecret: getEnv('JWT_ACCESS_SECRET', 'change-me'),
  jwtRefreshSecret: getEnv('JWT_REFRESH_SECRET', 'change-me-too'),
  jwtAccessExpiresIn: getEnv('JWT_ACCESS_EXPIRES_IN', '15m'),
  jwtRefreshExpiresIn: getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
  passwordSaltRounds: toNumber(getEnv('PASSWORD_SALT_ROUNDS', '12'), 12),
};
