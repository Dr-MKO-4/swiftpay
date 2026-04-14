// backend/src/config/redis.js
const redis = require('redis');
const { logger } = require('./logger');

const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

client.on('error', (err) => {
  logger.error(`Redis error: ${err.message}`);
});

client.on('connect', () => {
  logger.info('Redis connected');
});

client.on('reconnecting', () => {
  logger.info('Redis reconnecting...');
});

module.exports = client;
