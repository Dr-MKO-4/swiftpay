// src/services/errorHandler.js
/**
 * Service centralisé de gestion des erreurs
 * Normalise les erreurs de l'API et fournit des messages utilisateur convivial
 */

class ErrorHandler {
  constructor() {
    this.errorMap = {
      // Network errors
      'Network Error': 'Erreur de connexion. Vérifiez votre connexion internet.',
      'ECONNREFUSED': 'Serveur non accessible. Veuillez réessayer plus tard.',
      'ENOTFOUND': 'Erreur de connexion. Vérifiez l\'adresse du serveur.',
      'ETIMEDOUT': 'La requête a expiré. Veuillez réessayer.',
      
      // Auth errors  
      'Identifiants invalides': 'Email ou mot de passe incorrect.',
      'OTP invalide ou expiré': 'Le code OTP est invalide ou a expiré.',
      'Token expiré': 'Votre session a expiré. Veuillez vous reconnecter.',
      'Token invalide': 'Session invalide.',
      
      // User errors
      'Utilisateur non trouvé': 'Cet utilisateur n\'existe pas.',
      'Email ou nom d\'utilisateur déjà utilisé': 'Cet email ou nom d\'utilisateur est déjà pris.',
      
      // Transfer errors
      'Solde insuffisant': 'Vous n\'avez pas assez d\'argent pour ce transfert.',
      'Limite quotidienne dépassée': 'Vous avez atteint votre limite quotidienne de transfert.',
      'Limite mensuelle dépassée': 'Vous avez atteint votre limite mensuelle de transfert.',
      'Destinataire introuvable': 'Le destinataire n\'existe pas.',
      'Impossible de transférer vers votre propre compte': 'Vous ne pouvez pas transférer vers vous-même.',
      
      // Validation errors
      'Email invalide': 'Adresse email invalide.',
      'Mot de passe trop court': 'Le mot de passe doit contenir au moins 6 caractères.',
      'Mot de passe doit contenir au moins 8 caractères': 'Le mot de passe doit contenir au moins 8 caractères.',
      'Mot de passe doit contenir au moins une majuscule': 'Ajoutez une majuscule à votre mot de passe.',
      'Mot de passe doit contenir au moins un chiffre': 'Ajoutez un chiffre à votre mot de passe.',
      'Mot de passe doit contenir un caractère spécial': 'Ajoutez un caractère spécial (!@#$%^&*) à votre mot de passe.',
    };
  }

  /**
   * Analyser une erreur et retourner un message utilisateur
   */
  getErrorMessage(error) {
    if (!error) return 'Une erreur inconnue s\'est produite.';

    // Si c'est un string directement
    if (typeof error === 'string') {
      return this.errorMap[error] || error;
    }

    // Si c'est une erreur d'axios/fetch
    if (error.response?.data?.message) {
      return this.errorMap[error.response.data.message] || error.response.data.message;
    }

    if (error.response?.data?.errors?.[0]?.msg) {
      return this.errorMap[error.response.data.errors[0].msg] || error.response.data.errors[0].msg;
    }

    if (error.message) {
      return this.errorMap[error.message] || error.message;
    }

    return 'Une erreur inconnue s\'est produite.';
  }

  /**
   * Obtenir le code d'erreur HTTP
   */
  getErrorCode(error) {
    return error?.response?.status || error?.code || 500;
  }

  /**
   * Normaliser une erreur pour le logging
   */
  normalizeError(error) {
    return {
      message: this.getErrorMessage(error),
      code: this.getErrorCode(error),
      timestamp: new Date().toISOString(),
      originalError: error.message || JSON.stringify(error),
    };
  }

  /**
   * Déterminer si l'erreur est une erreur réseau
   */
  isNetworkError(error) {
    return (
      !error.response ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ETIMEDOUT' ||
      error.message === 'Network Error'
    );
  }

  /**
   * Déterminer si c'est une erreur d'authentification
   */
  isAuthError(error) {
    return (
      error.response?.status === 401 ||
      error.response?.status === 403 ||
      error.response?.data?.message?.includes('Token') ||
      error.response?.data?.message?.includes('authentif')
    );
  }

  /**
   * Déterminer si c'est une erreur de validation
   */
  isValidationError(error) {
    return (
      error.response?.status === 400 ||
      error.response?.data?.errors
    );
  }

  /**
   * Obtenir tous les message d'erreur de validation
   */
  getValidationErrors(error) {
    if (!error.response?.data?.errors) return [];
    return error.response.data.errors.map(err => ({
      field: err.param,
      message: this.errorMap[err.msg] || err.msg,
    }));
  }
}

export default new ErrorHandler();
