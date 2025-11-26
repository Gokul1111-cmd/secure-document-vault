const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.printf(({ level, message, timestamp, stack, ...meta }) => {
      const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} [${level.toUpperCase()}] ${stack || message}${metaString}`;
    }),
  ),
  transports: [new transports.Console()],
});

logger.http = (msg) => logger.log({ level: 'http' in logger.levels ? 'http' : 'info', message: msg });

module.exports = logger;
