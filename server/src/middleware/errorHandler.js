const logger = require('../utils/logger');

const errorHandler = (err, _req, res, _next) => {
  logger.error(err.message, { stack: err.stack });

  const statusCode = err.statusCode || 500;
  const message = statusCode >= 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    status: 'error',
    message,
  });
};

module.exports = errorHandler;
