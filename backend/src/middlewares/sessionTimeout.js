// backend/src/middlewares/sessionTimeout.js
const { logger } = require('../config/logger');

const SESSION_TIMEOUT = process.env.SESSION_TIMEOUT || 30 * 60 * 1000; // 30 min

/**
 * Middleware pour gérer le timeout de session
 * Déconnecte les utilisateurs après X minutes d'inactivité
 */
const sessionTimeoutMiddleware = (req, res, next) => {
  // Ignorer les requests sans authentification
  if (!req.user) return next();

  const now = Date.now();
  const lastActivity = req.session?.lastActivity || now;
  const timeSinceLastActivity = now - lastActivity;

  if (timeSinceLastActivity > SESSION_TIMEOUT) {
    logger.warn(`Session timeout for user ${req.user.id}`);
    return res.status(401).json({
      error: 'Session expired',
      code: 'SESSION_TIMEOUT',
    });
  }

  // Mettre à jour la dernière activité
  if (req.session) {
    req.session.lastActivity = now;
  }

  next();
};

/**
 * Middleware pour tracker les activités utilisateur
 */
const activityTrackingMiddleware = (req, res, next) => {
  if (req.user) {
    // Track l'activité dans les logs
    logger.info(`User ${req.user.id} - ${req.method} ${req.path}`, {
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  }
  next();
};

module.exports = {
  sessionTimeoutMiddleware,
  activityTrackingMiddleware,
  SESSION_TIMEOUT,
};
