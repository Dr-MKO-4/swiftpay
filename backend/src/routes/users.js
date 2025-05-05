// src/routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { authenticateJWT } = require('../middlewares/authMiddleware');
// GET /api/users/profile
router.get('/profile', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await db.query(
      `SELECT u.user_id, u.username, u.full_name, u.email, u.phone_number, u.created_at,
              p.language, p.theme
       FROM users u
       JOIN user_preferences p ON p.user_id = u.user_id
       WHERE u.user_id = $1`,
      [userId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

// PUT /api/users/profile
router.put(
  '/profile',
  authenticateJWT,
  [
    body('full_name').optional().isLength({ max: 100 }),
    body('phone_number').optional().isMobilePhone(),
    body('email').optional().isEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const userId = req.user.id;
    const { full_name, phone_number, email, language, theme } = req.body;
    try {
      // Begin transaction
      await db.query('BEGIN');
      const fields = [];
      const params = [];
      let idx = 1;
      if (full_name) { fields.push(`full_name = $${idx++}`); params.push(full_name); }
      if (phone_number) { fields.push(`phone_number = $${idx++}`); params.push(phone_number); }
      if (email) { fields.push(`email = $${idx++}`); params.push(email); }

      if (fields.length) {
        await db.query(
          `UPDATE users SET ${fields.join(', ')} WHERE user_id = $${idx}`,
          [...params, userId]
        );
      }
      if (language || theme) {
        const upref = [];
        if (language) { upref.push(`language = $${idx++}`); params.push(language); }
        if (theme)    { upref.push(`theme = $${idx++}`);    params.push(theme); }
        if (upref.length) {
          await db.query(
            `UPDATE user_preferences SET ${upref.join(', ')} WHERE user_id = $${idx}`,
            [...params, userId]
          );
        }
      }
      await db.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await db.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ error: 'Erreur mise à jour profil' });
    }
  }
);

module.exports = router;