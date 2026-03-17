// src/routes/passwordReset.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const passwordResetService = require('../services/passwordResetService');

const validators = {
  forgotPassword: [
    body('email').isEmail().withMessage('Email invalide'),
  ],
  resetPassword: [
    body('token').notEmpty().withMessage('Token requis'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Mot de passe doit contenir au moins 8 caractères')
      .matches(/[A-Z]/)
      .withMessage('Mot de passe doit contenir au moins une majuscule')
      .matches(/[0-9]/)
      .withMessage('Mot de passe doit contenir au moins un chiffre')
      .matches(/[!@#$%^&*]/)
      .withMessage('Mot de passe doit contenir un caractère spécial (!@#$%^&*)'),
  ],
};

// POST /forgot-password - Envoyer email de reset
router.post('/forgot-password', validators.forgotPassword, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email } = req.body;
    const result = await passwordResetService.sendResetEmail(email);
    return res.json(result);
  } catch (err) {
    if (err.message === 'Utilisateur non trouvé') {
      // Ne pas révéler si l'email existe (sécurité)
      return res.json({ success: true, message: 'Email de réinitialisation envoyé' });
    }
    return next(err);
  }
});

// POST /reset-password - Réinitialiser le mot de passe
router.post('/reset-password', validators.resetPassword, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { token, newPassword } = req.body;
    const result = await passwordResetService.resetPassword(token, newPassword);
    return res.json(result);
  } catch (err) {
    if (err.message === 'Token invalide' || err.message === 'Token expiré') {
      return res.status(401).json({ success: false, message: err.message });
    }
    return next(err);
  }
});

module.exports = router;
