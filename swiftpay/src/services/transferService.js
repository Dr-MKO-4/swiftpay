// src/services/transferService.js
import axios from 'axios';
import { API_BASE_URL } from './config';
import errorHandler from './errorHandler';

class TransferService {
  /**
   * Effectuer un transfert
   */
  async transfer(recipientId, amount, description = '') {
    try {
      const response = await axios.post(`${API_BASE_URL}/transfers`, {
        recipientId: parseInt(recipientId),
        amount: parseFloat(amount),
        description,
      });
      return response.data;
    } catch (error) {
      const normalizedError = errorHandler.normalizeError(error);
      throw normalizedError;
    }
  }

  /**
   * Obtenir les limites de transfert
   */
  async getTransferLimits() {
    try {
      const response = await axios.get(`${API_BASE_URL}/transfers/limits`);
      return response.data.data;
    } catch (error) {
      const normalizedError = errorHandler.normalizeError(error);
      throw normalizedError;
    }
  }

  /**
   * Valider un transfert avant envoi
   */
  validateTransfer(amount, recipientId) {
    const errors = [];

    if (!recipientId) {
      errors.push('Destinataire requis');
    }

    if (!amount || isNaN(parseFloat(amount))) {
      errors.push('Montant invalide');
    }

    if (parseFloat(amount) <= 0) {
      errors.push('Le montant doit être positif');
    }

    if (parseFloat(amount) > 99999.99) {
      errors.push('Montant trop élevé');
    }

    return { isValid: errors.length === 0, errors };
  }
}

export default new TransferService();
