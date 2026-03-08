const fs = require('fs');
const logger = require('../utils/logger');

const errorHandler = (err, _req, res, _next) => {
  logger.error(err.message, { stack: err.stack });

  try {
    fs.appendFileSync('error-debug.log', `\n[${new Date().toISOString()}] ${err.stack}\n`);
  } catch (e) { }

  const statusCode = err.statusCode || 500;
  const message = statusCode >= 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    status: 'error',
    message,
  });
};

module.exports = errorHandler;
