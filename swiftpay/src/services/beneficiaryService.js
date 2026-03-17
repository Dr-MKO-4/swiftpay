// src/services/beneficiaryService.js
import axios from 'axios';
import { API_BASE_URL } from './config';
import errorHandler from './errorHandler';

class BeneficiaryService {
  /**
   * Ajouter un bénéficiaire
   */
  async addBeneficiary(beneficiaryUserId, nickname = '') {
    try {
      const response = await axios.post(`${API_BASE_URL}/beneficiaries`, {
        beneficiaryUserId: parseInt(beneficiaryUserId),
        nickname,
      });
      return response.data;
    } catch (error) {
      const normalizedError = errorHandler.normalizeError(error);
      throw normalizedError;
    }
  }

  /**
   * Obtenir tous les bénéficiaires
   */
  async getBeneficiaries() {
    try {
      const response = await axios.get(`${API_BASE_URL}/beneficiaries`);
      return response.data.data || [];
    } catch (error) {
      const normalizedError = errorHandler.normalizeError(error);
      throw normalizedError;
    }
  }

  /**
   * Mettre à jour le surnom d'un bénéficiaire
   */
  async updateBeneficiary(beneficiaryId, nickname) {
    try {
      const response = await axios.put(`${API_BASE_URL}/beneficiaries/${beneficiaryId}`, {
        nickname,
      });
      return response.data;
    } catch (error) {
      const normalizedError = errorHandler.normalizeError(error);
      throw normalizedError;
    }
  }

  /**
   * Supprimer un bénéficiaire
   */
  async removeBeneficiary(beneficiaryId) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/beneficiaries/${beneficiaryId}`);
      return response.data;
    } catch (error) {
      const normalizedError = errorHandler.normalizeError(error);
      throw normalizedError;
    }
  }

  /**
   * Valider les données d'ajout de bénéficiaire
   */
  validateBeneficiary(beneficiaryUserId, nickname = '') {
    const errors = [];

    if (!beneficiaryUserId) {
      errors.push('ID bénéficiaire requis');
    }

    if (isNaN(parseInt(beneficiaryUserId))) {
      errors.push('ID bénéficiaire invalide');
    }

    if (nickname && nickname.length > 50) {
      errors.push('Surnom max 50 caractères');
    }

    return { isValid: errors.length === 0, errors };
  }
}

export default new BeneficiaryService();
