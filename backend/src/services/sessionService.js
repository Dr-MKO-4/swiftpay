// backend/src/services/sessionService.js
const db = require('../config/db');
const crypto = require('crypto');
const { logger } = require('../config/logger');

class SessionService {
  /**
   * Créer une nouvelle session
   */
  async createSession(userId, tokenJti, ip, userAgent) {
    try {
      const sessionId = crypto.randomBytes(16).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

      await db.query(
        `INSERT INTO user_sessions (user_id, session_id, token_jti, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, sessionId, tokenJti, ip, userAgent, expiresAt]
      );

      logger.info(`Session created for user ${userId}`);
      return { sessionId, expiresAt };
    } catch (error) {
      logger.error(`Error creating session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Valider une session
   */
  async validateSession(userId, sessionId) {
    try {
      const result = await db.query(
        `SELECT * FROM user_sessions 
         WHERE user_id = $1 AND session_id = $2 AND expires_at > NOW()`,
        [userId, sessionId]
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error validating session: ${error.message}`);
      return false;
    }
  }

  /**
   * Invalider une session (logout)
   */
  async invalidateSession(userId, sessionId) {
    try {
      await db.query(
        `UPDATE user_sessions SET expires_at = NOW() 
         WHERE user_id = $1 AND session_id = $2`,
        [userId, sessionId]
      );

      logger.info(`Session invalidated for user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error(`Error invalidating session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Invalider toutes les sessions d'un utilisateur
   */
  async invalidateAllSessions(userId) {
    try {
      await db.query(
        `UPDATE user_sessions SET expires_at = NOW() WHERE user_id = $1`,
        [userId]
      );

      logger.warn(`All sessions invalidated for user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error(`Error invalidating all sessions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Nettoyer les sessions expirées
   */
  async cleanupExpiredSessions() {
    try {
      const result = await db.query(`DELETE FROM user_sessions WHERE expires_at < NOW()`);

      logger.info(`Cleaned up ${result.rowCount} expired sessions`);
      return { deleted: result.rowCount };
    } catch (error) {
      logger.error(`Error cleaning up sessions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Masquer les données sensibles
   */
  maskSensitiveData(user) {
    if (!user) return null;

    return {
      id: user.id,
      email: this.maskEmail(user.email),
      full_name: user.full_name,
      phone_number: this.maskPhone(user.phone_number),
      created_at: user.created_at,
      // Ne pas inclure: password, password_reset_token, etc.
    };
  }

  /**
   * Masquer une adresse email
   */
  maskEmail(email) {
    if (!email) return null;
    const [name, domain] = email.split('@');
    const maskedName = name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1);
    return `${maskedName}@${domain}`;
  }

  /**
   * Masquer un numéro de téléphone
   */
  maskPhone(phone) {
    if (!phone) return null;
    return phone.slice(0, 3) + '*'.repeat(phone.length - 6) + phone.slice(-3);
  }

  /**
   * Obtenir les sessions actives d'un utilisateur
   */
  async getActiveSessions(userId) {
    try {
      const result = await db.query(
        `SELECT id, session_id, ip_address, user_agent, created_at, expires_at
         FROM user_sessions 
         WHERE user_id = $1 AND expires_at > NOW()
         ORDER BY created_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error(`Error fetching sessions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Détecter les activités suspectes
   */
  async detectSuspiciousActivity(userId, ip, userAgent) {
    try {
      // Récupérer les sessions récentes
      const result = await db.query(
        `SELECT DISTINCT ip_address, user_agent FROM user_sessions 
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'`,
        [userId]
      );

      // Vérifier si IP ou user agent est nouveau
      const sessions = result.rows;
      const newIp = !sessions.some((s) => s.ip_address === ip);
      const newUserAgent = !sessions.some((s) => s.user_agent === userAgent);

      if (newIp || newUserAgent) {
        logger.warn(
          `Suspicious activity detected for user ${userId}: newIP=${newIp}, newUA=${newUserAgent}`
        );
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Error detecting suspicious activity: ${error.message}`);
      return false;
    }
  }
}

module.exports = new SessionService();
