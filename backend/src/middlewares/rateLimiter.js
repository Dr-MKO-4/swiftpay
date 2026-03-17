// src/middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Limite générale : 15 requêtes par 15 min
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Trop de requêtes, veuillez réessayer plus tard',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test',
});

// Limite stricte pour login/OTP : 5 requêtes par 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Trop de tentatives de connexion, réessayez dans 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.email || req.ip,
  skip: (req) => process.env.NODE_ENV === 'test',
});

// Limite stricte pour OTP : 5 requêtes par 15 min
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Trop de tentatives de vérification OTP, réessayez dans 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.email || req.ip,
  skip: (req) => process.env.NODE_ENV === 'test',
});

module.exports = { generalLimiter, authLimiter, otpLimiter };
