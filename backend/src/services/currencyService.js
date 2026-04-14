// src/services/currencyService.js
const db = require('../config/db');
const axios = require('axios');
const { logger } = require('../config/logger');
const cacheService = require('./cacheService');

const RATES_UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24h
const RATES_CACHE_TTL = 24 * 60 * 60; // 24h en secondes
const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest';

class CurrencyService {
  /**
   * Obtenir tous les taux de change
   */
  async getExchangeRates(baseCurrency = 'USD') {
    try {
      // Try cache first
      const cacheKey = `rates:${baseCurrency}`;
      let rates = await cacheService.get(cacheKey);

      if (rates) {
        logger.info(`Using cached rates for ${baseCurrency}`);
        return rates;
      }

      // Vérifier si les rates en cache BD sont à jour
      const cached = await db.query(
        'SELECT rates, updated_at FROM currency_rates WHERE base_currency = $1',
        [baseCurrency]
      );

      if (cached.rows.length > 0) {
        const updated = new Date(cached.rows[0].updated_at);
        const now = new Date();
        if (now - updated < RATES_UPDATE_INTERVAL) {
          rates = JSON.parse(cached.rows[0].rates);
          // Cache in Redis
          await cacheService.set(cacheKey, rates, RATES_CACHE_TTL);
          return rates;
        }
      }

      // Récupérer les nouvelles rates
      const response = await axios.get(`${EXCHANGE_API_URL}/${baseCurrency}`, {
        timeout: 5000,
      });

      rates = response.data.rates;

      // Sauvegarder en BD
      await db.query(
        `INSERT INTO currency_rates (base_currency, rates, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (base_currency) DO UPDATE
         SET rates = $2, updated_at = NOW()`,
        [baseCurrency, JSON.stringify(rates)]
      );

      // Cache in Redis
      await cacheService.set(cacheKey, rates, RATES_CACHE_TTL);

      logger.info(`Currency rates fetched and cached for ${baseCurrency}`);
      return rates;
    } catch (error) {
      logger.error(`Error fetching currency rates: ${error.message}`);
      // Retourner les rates en cache même si expirées
      const cached = await db.query(
        'SELECT rates FROM currency_rates WHERE base_currency = $1',
        [baseCurrency]
      );
      if (cached.rows.length > 0) {
        return JSON.parse(cached.rows[0].rates);
      }
      throw new Error('Unable to fetch currency rates');
    }
  }

  /**
   * Convertir un montant d'une devise à une autre
   */
  async convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return { amount: parseFloat(amount), from: fromCurrency, to: toCurrency };
    }

    try {
      const rates = await this.getExchangeRates(fromCurrency);

      if (!rates[toCurrency]) {
        throw new Error(`Currency ${toCurrency} not available`);
      }

      const convertedAmount = parseFloat(amount) * rates[toCurrency];

      return {
        amount: parseFloat(convertedAmount.toFixed(2)),
        from: fromCurrency,
        to: toCurrency,
        rate: parseFloat(rates[toCurrency].toFixed(4)),
      };
    } catch (error) {
      logger.error(`Conversion error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtenir les devises supportées
   */
  async getSupportedCurrencies() {
    try {
      const rates = await this.getExchangeRates('USD');
      const currencies = ['USD', ...Object.keys(rates)].sort();
      return currencies;
    } catch (error) {
      logger.error(`Error getting supported currencies: ${error.message}`);
      return ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR'];
    }
  }

  /**
   * Obtenir le taux de change entre deux devises
   */
  async getExchangeRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return 1;

    try {
      const rates = await this.getExchangeRates(fromCurrency);
      return rates[toCurrency] || throw new Error('Rate not found');
    } catch (error) {
      logger.error(`Error getting exchange rate: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new CurrencyService();
