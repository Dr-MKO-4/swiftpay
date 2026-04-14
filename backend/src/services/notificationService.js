// src/services/notificationService.js
const db = require('../config/db');
const admin = require('firebase-admin');
const { logger } = require('../config/logger');

// Initialize Firebase Admin
let firebaseInitialized = false;
if (process.env.FIREBASE_CONFIG_PATH && !firebaseInitialized) {
  try {
    const serviceAccount = require(process.env.FIREBASE_CONFIG_PATH);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
  } catch (error) {
    logger.warn('Firebase not initialized: ' + error.message);
  }
}

class NotificationService {
  /**
   * Enregistrer le token FCM d'un utilisateur
   */
  async registerToken(userId, token, deviceInfo = '') {
    try {
      await db.query(
        `INSERT INTO fcm_tokens (user_id, token, device_info, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, token) DO UPDATE
         SET device_info = $3, created_at = NOW()`,
        [userId, token, deviceInfo]
      );

      logger.info(`FCM token registered for user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error(`Error registering FCM token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envoyer une notification à un utilisateur
   */
  async sendToUser(userId, title, body, data = {}) {
    try {
      // Récupérer les tokens FCM de l'utilisateur
      const result = await db.query(
        'SELECT token FROM fcm_tokens WHERE user_id = $1 AND active = true',
        [userId]
      );

      if (result.rows.length === 0) {
        logger.warn(`No FCM tokens found for user ${userId}`);
        return { success: false, message: 'No tokens' };
      }

      const tokens = result.rows.map((r) => r.token);
      const messages = tokens.map((token) => ({
        notification: { title, body },
        data,
        token,
      }));

      if (!firebaseInitialized) {
        logger.warn('Firebase not initialized, notification not sent');
        return { success: false, message: 'Firebase not initialized' };
      }

      const response = await admin.messaging().sendAll(messages);

      // Sauvegarder la notification
      await db.query(
        `INSERT INTO notifications (user_id, title, body, type, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, title, body, 'push', JSON.stringify(data)]
      );

      logger.info(`Notifications sent to user ${userId}: ${response.successCount} success`);
      return { success: true, sent: response.successCount };
    } catch (error) {
      logger.error(`Error sending notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envoyer une notification de transaction
   */
  async sendTransactionNotification(userId, transactionType, amount, description = '') {
    const title = {
      deposit: 'Dépôt confirmé',
      withdrawal: 'Retrait confirmé',
      transfer: 'Transfert envoyé',
      transfer_received: 'Transfert reçu',
    }[transactionType] || 'Transaction';

    const body = `${title}: $${amount} ${description}`;

    return this.sendToUser(userId, title, body, {
      type: 'transaction',
      amount,
      transactionType,
    });
  }

  /**
   * Envoyer une notification d'authentification
   */
  async sendAuthNotification(userId, message) {
    return this.sendToUser(userId, 'Alerte sécurité', message, {
      type: 'auth',
    });
  }

  /**
   * Supprimer un token (device désinstallation, logout, etc)
   */
  async removeToken(userId, token) {
    try {
      await db.query(
        'DELETE FROM fcm_tokens WHERE user_id = $1 AND token = $2',
        [userId, token]
      );

      logger.info(`FCM token removed for user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error(`Error removing FCM token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Désactiver les tokens non valides
   */
  async disableInvalidTokens(tokens) {
    try {
      const placeholders = tokens.map((_, i) => `$${i + 1}`).join(',');
      await db.query(`UPDATE fcm_tokens SET active = false WHERE token IN (${placeholders})`, tokens);

      logger.info(`Disabled ${tokens.length} invalid FCM tokens`);
    } catch (error) {
      logger.error(`Error disabling invalid tokens: ${error.message}`);
    }
  }

  /**
   * Obtenir les notifications de l'utilisateur
   */
  async getUserNotifications(userId, limit = 50) {
    try {
      const result = await db.query(
        `SELECT * FROM notifications WHERE user_id = $1 
         ORDER BY created_at DESC LIMIT $2`,
        [userId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error(`Error fetching notifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * Marquer une notification comme lue
   */
  async markAsRead(notificationId) {
    try {
      await db.query('UPDATE notifications SET read = true WHERE id = $1', [notificationId]);
      return { success: true };
    } catch (error) {
      logger.error(`Error marking notification as read: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new NotificationService();
