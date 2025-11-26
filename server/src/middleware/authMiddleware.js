const jwt = require('jsonwebtoken');
const env = require('../config/env');
const logger = require('../utils/logger');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Access token required',
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, env.jwtAccessSecret);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token expired',
      });
    }
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Authentication failed',
    });
  }
};

module.exports = authMiddleware;
