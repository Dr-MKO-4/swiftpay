// src/services/passwordResetService.js
import axios from 'axios';
import { API_BASE_URL } from './config';
import errorHandler from './errorHandler';

class PasswordResetService {
  /**
   * Demander la réinitialisation du mot de passe
   */
  async requestPasswordReset(email) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
      return response.data;
    } catch (error) {
      const normalizedError = errorHandler.normalizeError(error);
      throw normalizedError;
    }
  }

  /**
   * Réinitialiser le mot de passe avec le token
   */
  async resetPassword(token, newPassword) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        token,
        newPassword,
      });
      return response.data;
    } catch (error) {
      const normalizedError = errorHandler.normalizeError(error);
      throw normalizedError;
    }
  }

  /**
   * Vérifier si un token est valide
   */
  validatePassword(password) {
    const errors = [];

    if (password.length < 8) {
      errors.push('Au moins 8 caractères');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Au moins une majuscule');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Au moins un chiffre');
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Un caractère spécial (!@#$%^&*)');
    }

    return { isValid: errors.length === 0, errors };
  }
}

export default new PasswordResetService();
