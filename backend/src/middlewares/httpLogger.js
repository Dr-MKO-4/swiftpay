// src/middlewares/httpLogger.js
const morgan = require('morgan');
const { logger } = require('../config/logger');

// Custom Morgan format
const morganFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms';

const httpLogger = morgan(morganFormat, {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
  skip: (req) => {
    // Skip health checks et requests de monitoring
    return req.url === '/health' || req.url === '/api/health';
  },
});

module.exports = httpLogger;
