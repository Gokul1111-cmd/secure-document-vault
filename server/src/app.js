const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const router = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const logger = require('./utils/logger');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
// Allow multiple dev origins (Vite may shift ports if 5173 busy) and production domains
const allowedOrigins = new Set([
  ...env.clientOrigins,
  'http://localhost:5174',
]);

if (process.env.VERCEL_URL) {
  allowedOrigins.add(`https://${process.env.VERCEL_URL}`);
}

if (process.env.RENDER_EXTERNAL_URL) {
  allowedOrigins.add(process.env.RENDER_EXTERNAL_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // non-browser or same-origin
    if (allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many requests, please slow down.',
    });
  },
});
app.use(limiter);

app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms', {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  }),
);

app.use('/api', router);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
