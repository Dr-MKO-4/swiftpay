// src/routes/notifications.js
const express = require('express');
const { body, param, validationResult, query } = require('express-validator');
const authMiddleware = require('../middlewares/authMiddleware');
const notificationService = require('../services/notificationService');
const { logger } = require('../config/logger');

const router = express.Router();

// Toutes les routes notifications nécessitent l'authentification
router.use(authMiddleware);

/**
 * POST /api/notifications/register-token
 * Enregistrer le token FCM d'un device
 */
router.post(
  '/register-token',
  [body('token').notEmpty(), body('deviceInfo').optional().isString()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token, deviceInfo } = req.body;
      const userId = req.user.id;

      await notificationService.registerToken(userId, token, deviceInfo);

      res.json({ success: true, message: 'Token registered' });
    } catch (error) {
      logger.error(`Error registering token: ${error.message}`);
      res.status(500).json({ error: 'Failed to register token' });
    }
  }
);

/**
 * DELETE /api/notifications/token/:token
 * Supprimer un token FCM
 */
router.delete('/token/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const userId = req.user.id;

    await notificationService.removeToken(userId, token);

    res.json({ success: true, message: 'Token removed' });
  } catch (error) {
    logger.error(`Error removing token: ${error.message}`);
    res.status(500).json({ error: 'Failed to remove token' });
  }
});

/**
 * GET /api/notifications
 * Obtenir les notifications de l'utilisateur
 */
router.get('/', [query('limit').optional().isInt({ min: 1, max: 100 }).toInt()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { limit = 50 } = req.query;

    const notifications = await notificationService.getUserNotifications(userId, limit);

    res.json({ notifications });
  } catch (error) {
    logger.error(`Error fetching notifications: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * PUT /api/notifications/:notificationId/read
 * Marquer une notification comme lue
 */
router.put('/:(notificationId)/read', async (req, res, next) => {
  try {
    const { notificationId } = req.params;

    await notificationService.markAsRead(notificationId);

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    logger.error(`Error marking notification as read: ${error.message}`);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

module.exports = router;
