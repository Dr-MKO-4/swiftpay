// src/routes/auth.js
const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');


// Validators
const registerValidators = [
    body('email').isEmail().withMessage('Email invalide'),
    body('password').isLength({ min: 6 }).withMessage('Mot de passe trop court'),
    body('fullName').notEmpty().withMessage('Nom complet requis'),
    body('username').notEmpty().withMessage("Nom d'utilisateur requis"),
    body('phone').optional().isMobilePhone().withMessage('Numéro de téléphone invalide'),
  ];
  
  const loginValidators = [
    body('email').isEmail().withMessage('Email invalide'),
    body('password').notEmpty().withMessage('Mot de passe requis'),
  ];
  
  const requestOtpValidators = [
    body('email').isEmail().withMessage('Email invalide'),
  ];
  
  const verifyOtpValidators = [
    body('email').isEmail().withMessage('Email invalide'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP invalide'),
  ];

  // ← ajoute, par exemple, juste après faceValidators
const prefsValidators = [
  body('language')
    .isIn(['fr','en','es'])
    .withMessage('Langue invalide'),
  body('theme')
    .isIn(['light','dark','system'])
    .withMessage('Thème invalide'),
];

  
  // ← nouveaux validateurs pour la biométrie
  const biometricValidators = [
    body('publicKey').notEmpty().withMessage('publicKey requis'),
    body('deviceInfo').notEmpty().withMessage('deviceInfo requis'),
  ];
  const faceValidators = [
      body('image')
        .notEmpty().withMessage('Image requise')
        // on retire le header data:…, puis tous les espaces/sauts de ligne
        .customSanitizer(v => 
          typeof v === 'string'
            ? v.replace(/^data:image\/\w+;base64,/, '').replace(/\s+/g, '')
            : v
        )
        // on autorise la base64 “url-safe”
        .isBase64({ urlSafe: true }).withMessage('Image doit être Base64'),
     ];
  


// Routes
router.post('/register',      ...registerValidators,    authController.register);
router.post('/login',         ...loginValidators,       authController.login);
router.post('/request-otp',   ...requestOtpValidators,  authController.requestOtp);
router.post('/verify-otp',    ...verifyOtpValidators,   authController.verifyOtp);

router.post(
  '/register-biometric',
  biometricValidators,
  authController.authenticate,     // Modified: middlewares path fixed
  authController.registerBiometric
);

router.post(
  '/preferences',
  prefsValidators,
  authController.authenticate,
  authController.updatePreferences
);

router.post(
    '/register-face',
    faceValidators,
    authController.authenticate,   // JWT middlewares
    authController.registerFace    // controller décommenté
  );

router.get('/profile', authController.authenticate, authController.profile);

module.exports = router;
