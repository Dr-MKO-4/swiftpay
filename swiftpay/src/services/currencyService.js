// swiftpay/src/services/currencyService.js
import api from './api';

class CurrencyService {
  /**
   * Obtenir les taux de change
   */
  async getExchangeRates(baseCurrency = 'USD') {
    try {
      const response = await api.get(`/currencies/rates`, {
        params: { base: baseCurrency },
      });
      return response.data.rates;
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      throw error;
    }
  }

  /**
   * Obtenir les devises supportées
   */
  async getSupportedCurrencies() {
    try {
      const response = await api.get('/currencies/supported');
      return response.data.currencies || [];
    } catch (error) {
      console.error('Error fetching supported currencies:', error);
      throw error;
    }
  }

  /**
   * Convertir un montant
   */
  async convertCurrency(amount, fromCurrency, toCurrency) {
    try {
      const response = await api.post('/currencies/convert', {
        amount: parseFloat(amount),
        from: fromCurrency.toUpperCase(),
        to: toCurrency.toUpperCase(),
      });

      return {
        amount: response.data.amount,
        from: response.data.from,
        to: response.data.to,
        rate: response.data.rate,
      };
    } catch (error) {
      console.error('Error converting currency:', error);
      throw error;
    }
  }

  /**
   * Obtenir le taux de change entre deux devises
   */
  async getExchangeRate(fromCurrency, toCurrency) {
    try {
      const response = await api.get(`/currencies/rate/${fromCurrency}/${toCurrency}`);
      return response.data.rate;
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      throw error;
    }
  }

  /**
   * Formater un montant avec symbole de devise
   */
  formatCurrency(amount, currency = 'USD') {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    });
    return formatter.format(amount);
  }
}

export default new CurrencyService();
