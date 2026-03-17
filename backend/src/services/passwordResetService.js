// src/services/passwordResetService.js
const db = require('../config/db');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../config/mailer');

const RESET_TOKEN_EXPIRATION_MS = 60 * 60 * 1000; // 1 heure

// Générer un token secure de reset
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Envoyer email de reset
exports.sendResetEmail = async (email) => {
  const result = await db.query('SELECT user_id FROM users WHERE email = $1', [email]);
  if (!result.rows.length) {
    throw new Error('Utilisateur non trouvé');
  }

  const userId = result.rows[0].user_id;
  const token = generateResetToken();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRATION_MS);

  // Supprimer les tokens précédents
  await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);

  // Créer nouveau token
  await db.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  // Envoyer email avec lien
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  await sendPasswordResetEmail(email, resetLink);

  return { success: true, message: 'Email de réinitialisation envoyé' };
};

// Vérifier et réinitialiser le mot de passe
exports.resetPassword = async (token, newPassword) => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const result = await db.query(
    `SELECT user_id, expires_at FROM password_reset_tokens
     WHERE token_hash = $1`,
    [tokenHash]
  );

  if (!result.rows.length) {
    throw new Error('Token invalide');
  }

  const { user_id, expires_at } = result.rows[0];

  if (new Date() > new Date(expires_at)) {
    await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user_id]);
    throw new Error('Token expiré');
  }

  // Hasher le nouveau mot de passe
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // Mettre à jour le mot de passe
  await db.query('BEGIN');
  try {
    await db.query(
      'UPDATE users SET password_hash = $1, salt = $2 WHERE user_id = $3',
      [hashedPassword, salt, user_id]
    );

    // Supprimer le token
    await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user_id]);

    await db.query('COMMIT');
    return { success: true, message: 'Mot de passe réinitialisé avec succès' };
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
};
