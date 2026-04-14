// backend/src/middlewares/encryptionMiddleware.js
const crypto = require('crypto');
const { logger } = require('../config/logger');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Middleware pour déchiffrer les données sensibles
 */
const decryptMiddleware = (req, res, next) => {
  // Seulement déchiffrer le champs "encrypted" s'il existe
  if (req.body && req.body.encrypted) {
    try {
      req.body = decryptData(req.body.encrypted);
    } catch (error) {
      logger.error(`Decryption error: ${error.message}`);
      return res.status(400).json({ error: 'Invalid encrypted data' });
    }
  }
  next();
};

/**
 * Chiffrer les données sensibles dans les réponses
 */
const encryptResponse = (data) => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
    };
  } catch (error) {
    logger.error(`Encryption error: ${error.message}`);
    throw error;
  }
};

/**
 * Déchiffrer les données
 */
const decryptData = (encryptedData) => {
  try {
    const { encrypted, iv } = encryptedData;
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      Buffer.from(iv, 'hex')
    );

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (error) {
    logger.error(`Decryption error: ${error.message}`);
    throw error;
  }
};

module.exports = {
  decryptMiddleware,
  encryptResponse,
  decryptData,
};
