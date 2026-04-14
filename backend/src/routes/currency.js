// src/routes/currency.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const currencyService = require('../services/currencyService');
const authMiddleware = require('../middlewares/authMiddleware');
const { logger } = require('../config/logger');

const router = express.Router();

/**
 * GET /api/currencies/rates?base=USD
 * Obtenir les taux de change
 */
router.get('/rates', async (req, res, next) => {
  try {
    const { base = 'USD' } = req.query;

    if (!/^[A-Z]{3}$/.test(base)) {
      return res.status(400).json({ error: 'Invalid currency code' });
    }

    const rates = await currencyService.getExchangeRates(base);
    res.json({ base, rates, timestamp: new Date() });
  } catch (error) {
    logger.error(`Error fetching rates: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch rates' });
  }
});

/**
 * GET /api/currencies/supported
 * Obtenir les devises supportées
 */
router.get('/supported', async (req, res, next) => {
  try {
    const currencies = await currencyService.getSupportedCurrencies();
    res.json({ currencies });
  } catch (error) {
    logger.error(`Error fetching currencies: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
});

/**
 * POST /api/currencies/convert
 * Convertir un montant
 */
router.post(
  '/convert',
  [
    body('amount').isFloat({ min: 0.01 }).toFloat(),
    body('from').isLength({ min: 3, max: 3 }).isUppercase(),
    body('to').isLength({ min: 3, max: 3 }).isUppercase(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { amount, from, to } = req.body;
      const converted = await currencyService.convertCurrency(amount, from, to);

      res.json(converted);
    } catch (error) {
      logger.error(`Conversion error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/currencies/rate/:from/:to
 * Obtenir le taux de change entre deux devises
 */
router.get(
  '/rate/:from/:to',
  [param('from').isLength({ min: 3, max: 3 }), param('to').isLength({ min: 3, max: 3 })],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { from, to } = req.params;
      const rate = await currencyService.getExchangeRate(from.toUpperCase(), to.toUpperCase());

      res.json({ from, to, rate });
    } catch (error) {
      logger.error(`Error fetching rate: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
