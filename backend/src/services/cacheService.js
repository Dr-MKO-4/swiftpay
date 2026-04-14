// backend/src/services/cacheService.js
const redis = require('../config/redis');
const { logger } = require('../config/logger');

class CacheService {
  /**
   * Obtenir une valeur du cache
   */
  async get(key) {
    try {
      const value = await redis.get(key);
      if (value) {
        logger.debug(`Cache hit: ${key}`);
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      logger.warn(`Cache get error: ${error.message}`);
      return null; // Fallback to DB
    }
  }

  /**
   * Sauvegarder une valeur en cache
   */
  async set(key, value, expiresIn = 3600) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', expiresIn);
      logger.debug(`Cache set: ${key} (expires in ${expiresIn}s)`);
    } catch (error) {
      logger.warn(`Cache set error: ${error.message}`);
    }
  }

  /**
   * Supprimer une clé du cache
   */
  async delete(key) {
    try {
      await redis.del(key);
      logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      logger.warn(`Cache delete error: ${error.message}`);
    }
  }

  /**
   * Vider le cache de patterns
   */
  async deletePattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.debug(`Cache cleared: ${pattern} (${keys.length} keys)`);
      }
    } catch (error) {
      logger.warn(`Cache clear error: ${error.message}`);
    }
  }

  /**
   * Vider tout le cache
   */
  async flush() {
    try {
      await redis.flushdb();
      logger.info('Cache flushed');
    } catch (error) {
      logger.warn(`Cache flush error: ${error.message}`);
    }
  }

  /**
   * Incrementer un compteur
   */
  async increment(key, expiresIn = 3600) {
    try {
      const value = await redis.incr(key);
      await redis.expire(key, expiresIn);
      return value;
    } catch (error) {
      logger.warn(`Cache increment error: ${error.message}`);
      return 0;
    }
  }

  /**
   * Obtenir les stats du cache
   */
  async getStats() {
    try {
      const info = await redis.info();
      const dbSize = await redis.dbsize();
      return {
        size: dbSize,
        info,
      };
    } catch (error) {
      logger.warn(`Cache stats error: ${error.message}`);
      return null;
    }
  }
}

module.exports = new CacheService();
