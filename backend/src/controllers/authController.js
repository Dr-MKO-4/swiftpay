// src/controllers/authController.js
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const fetch = require('node-fetch');
const { generateToken } = require('../services/jwtService');       // Modified: only generateToken needed
const { sendOTPEmail } = require('../config/mailer');              // Modified: updated path

const OTP_EXPIRATION_MS = 5 * 60 * 1000;

exports.register = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, fullName, username, phone } = req.body;
  const full_name   = fullName || null;
  const phone_number = phone || null;

  try {
    const exists = await db.query(
      'SELECT user_id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    if (exists.rows.length) return res.status(409).json({ message: "Email ou nom d'utilisateur déjà utilisé" });

    const salt   = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    await db.query('BEGIN');
    const insertUser = await db.query(
      `INSERT INTO users
         (username, email, password_hash, salt, full_name, phone_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, username, email, full_name, phone_number`,
      [username, email, hashed, salt, full_name, phone_number]
    );
    const user = insertUser.rows[0];

    await db.query('INSERT INTO user_preferences (user_id) VALUES ($1)', [user.user_id]);
    await db.query('SELECT create_wallet($1)', [user.user_id]);
    await db.query('COMMIT');

    const token = generateToken({ id: user.user_id, email: user.email });
    return res.status(201).json({ success: true, token });
  } catch (err) {
    await db.query('ROLLBACK');
    return next(err);
  }
};

exports.login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const result = await db.query(
      'SELECT user_id, password_hash FROM users WHERE email = $1',
      [email]
    );
    if (!result.rows.length) return res.status(401).json({ message: 'Identifiants invalides' });

    const user  = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Identifiants invalides' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await db.query(
      `INSERT INTO otp_secrets (user_id, secret, created_at)
         VALUES ($1, $2, now())
         ON CONFLICT (user_id) DO UPDATE
           SET secret = EXCLUDED.secret, created_at = now()`,
      [user.user_id, otp]
    );

    await sendOTPEmail(email, otp);
    return res.json({ success: true, otpRequired: true, message: 'OTP envoyé', email });
  } catch (err) {
    return next(err);
  }
};

exports.requestOtp = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email } = req.body;
  try {
    const result = await db.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (!result.rows.length) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const userId = result.rows[0].user_id;
    const otp    = Math.floor(100000 + Math.random() * 900000).toString();

    await db.query(
      `INSERT INTO otp_secrets (user_id, secret, created_at)
         VALUES ($1, $2, now())
         ON CONFLICT (user_id) DO UPDATE
           SET secret = EXCLUDED.secret, created_at = now()`,
      [userId, otp]
    );

    await sendOTPEmail(email, otp);
    return res.json({ success: true, message: 'OTP renvoyé' });
  } catch (err) {
    return next(err);
  }
};

exports.verifyOtp = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, otp } = req.body;
  try {
    const result = await db.query(
      `SELECT u.user_id, o.secret, o.created_at
         FROM users u
         JOIN otp_secrets o ON o.user_id = u.user_id
        WHERE u.email = $1`,
      [email]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const { user_id, secret, created_at } = result.rows[0];
    if (secret !== otp || (Date.now() - new Date(created_at)) > OTP_EXPIRATION_MS) {
      return res.status(401).json({ message: 'OTP invalide ou expiré' });
    }

    const token = generateToken({ id: user_id, email });
    return res.json({ success: true, token });
  } catch (err) {
    return next(err);
  }
};

exports.authenticate = require('../middlewares/authMiddleware').authenticateJWT; // Modified: updated path

exports.profile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rows } = await db.query(
      `SELECT user_id, username, full_name, email, phone_number, created_at
         FROM users
        WHERE user_id = $1`,
      [userId]
    );
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return next(err);
  }
};

exports.registerBiometric = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const userId = req.user.id;
  const { publicKey, deviceInfo } = req.body;

  try {
    // Upsert public key and device info on single row per user
    const { rows } = await db.query(
      `INSERT INTO biometric_keys
         (user_id, public_key, device_info, registered_at, last_used_at)
       VALUES ($1, $2, $3, now(), now())
      ON CONFLICT (user_id) DO UPDATE
        SET public_key   = EXCLUDED.public_key,
            device_info  = EXCLUDED.device_info,
            last_used_at = now()
      RETURNING key_id, user_id, public_key, device_info, registered_at, last_used_at`,
      [userId, publicKey, deviceInfo]
    );

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return next(err);
  }
};

exports.updatePreferences = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const userId = req.user.id;
  const { language, theme } = req.body;

  try {
    const result = await db.query(
      `UPDATE user_preferences
         SET language = $1, theme = $2
       WHERE user_id = $3
       RETURNING *`,
      [language, theme, userId]
    );
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return next(err);
  }
};


exports.registerFace = async (req, res, next) => {
  try {
    const raw = req.body.image || (Array.isArray(req.body.images) ? req.body.images[0] : null);
    if (!raw) return res.status(400).json({ success: false, message: 'Pas d’image reçue' });

    const userId = req.user.id;
    const image  = raw.startsWith('data:') ? raw.split(',')[1] : raw;

    // 1) On récupère l’ancienne public_key + device_info s’ils existent
    const prev = await db.query(
      `SELECT public_key, device_info
         FROM biometric_keys
        WHERE user_id = $1`,
      [userId]
    );
    const publicKey  = prev.rows[0]?.public_key  || null;
    const deviceInfo = prev.rows[0]?.device_info || null;

    // 2) On fait l’UPSERT en réinjectant ces valeurs
    const { rows } = await db.query(
      `INSERT INTO biometric_keys
         (user_id, public_key, device_info, face_image, registered_at, last_used_at)
       VALUES
         ($1,       $2,         $3,          $4,        now(),         now())
       ON CONFLICT (user_id) DO UPDATE
         SET face_image   = EXCLUDED.face_image,
             last_used_at = now()
       RETURNING *`,
      [userId, publicKey, deviceInfo, image]
    );

    console.log('[registerFace] Résultat BD:', rows[0]);
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[registerFace] ERREUR:', err);
    return next(err);
  }
};
