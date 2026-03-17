// src/services/i18nService.js
/**
 * Service de localisation (i18n) pour SwiftPay
 * Support du français, anglais, espagnol
 */

const translations = {
  fr: {
    // Navigation
    'Home': 'Accueil',
    'Dashboard': 'Tableau de bord',
    'Wallets': 'Portefeuilles',
    'Transactions': 'Transactions',
    'Settings': 'Paramètres',
    'Profile': 'Profil',
    
    // Auth
    'Login': 'Connexion',
    'Sign Up': 'Inscription',
    'Forgot Password': 'Mot de passe oublié',
    'Reset Password': 'Réinitialiser le mot de passe',
    'Logout': 'Déconnexion',
    'Email': 'Email',
    'Password': 'Mot de passe',
    'Confirm Password': 'Confirmer le mot de passe',
    'Full Name': 'Nom complet',
    'Username': 'Nom d\'utilisateur',
    'Phone': 'Téléphone',
    
    // Payments
    'Send Money': 'Envoyer de l\'argent',
    'Receive Money': 'Recevoir de l\'argent',
    'Transfer': 'Transfert',
    'Amount': 'Montant',
    'Recipient': 'Destinataire',
    'Description': 'Description',
    'Beneficiaries': 'Bénéficiaires',
    'Add Beneficiary': 'Ajouter un bénéficiaire',
    
    // Biometric
    'Fingerprint': 'Empreinte digitale',
    'Face ID': 'Reconnaissance faciale',
    'Biometric': 'Biométrie',
    
    // Messages
    'Email sent': 'Email envoyé',
    'Success': 'Succès',
    'Error': 'Erreur',
    'Warning': 'Avertissement',
    'Loading': 'Chargement...',
    'Cancel': 'Annuler',
    'Save': 'Enregistrer',
    'Delete': 'Supprimer',
    'Edit': 'Modifier',
    'Back': 'Retour',
    'Next': 'Suivant',
  },
  en: {
    'Home': 'Home',
    'Dashboard': 'Dashboard',
    'Wallets': 'Wallets',
    'Transactions': 'Transactions',
    'Settings': 'Settings',
    'Profile': 'Profile',
    
    'Login': 'Login',
    'Sign Up': 'Sign Up',
    'Forgot Password': 'Forgot Password',
    'Reset Password': 'Reset Password',
    'Logout': 'Logout',
    'Email': 'Email',
    'Password': 'Password',
    'Confirm Password': 'Confirm Password',
    'Full Name': 'Full Name',
    'Username': 'Username',
    'Phone': 'Phone',
    
    'Send Money': 'Send Money',
    'Receive Money': 'Receive Money',
    'Transfer': 'Transfer',
    'Amount': 'Amount',
    'Recipient': 'Recipient',
    'Description': 'Description',
    'Beneficiaries': 'Beneficiaries',
    'Add Beneficiary': 'Add Beneficiary',
    
    'Fingerprint': 'Fingerprint',
    'Face ID': 'Face ID',
    'Biometric': 'Biometric',
    
    'Email sent': 'Email sent',
    'Success': 'Success',
    'Error': 'Error',
    'Warning': 'Warning',
    'Loading': 'Loading...',
    'Cancel': 'Cancel',
    'Save': 'Save',
    'Delete': 'Delete',
    'Edit': 'Edit',
    'Back': 'Back',
    'Next': 'Next',
  },
  es: {
    'Home': 'Inicio',
    'Dashboard': 'Panel de control',
    'Wallets': 'Billeteras',
    'Transactions': 'Transacciones',
    'Settings': 'Configuración',
    'Profile': 'Perfil',
    
    'Login': 'Iniciar sesión',
    'Sign Up': 'Registrarse',
    'Forgot Password': 'Olvidó su contraseña',
    'Reset Password': 'Restablecer contraseña',
    'Logout': 'Cerrar sesión',
    'Email': 'Correo electrónico',
    'Password': 'Contraseña',
    'Confirm Password': 'Confirmar contraseña',
    'Full Name': 'Nombre completo',
    'Username': 'Nombre de usuario',
    'Phone': 'Teléfono',
    
    'Send Money': 'Enviar dinero',
    'Receive Money': 'Recibir dinero',
    'Transfer': 'Transferencia',
    'Amount': 'Cantidad',
    'Recipient': 'Destinatario',
    'Description': 'Descripción',
    'Beneficiaries': 'Beneficiarios',
    'Add Beneficiary': 'Agregar beneficiario',
    
    'Fingerprint': 'Huella dactilar',
    'Face ID': 'Face ID',
    'Biometric': 'Biométrico',
    
    'Email sent': 'Correo enviado',
    'Success': 'Éxito',
    'Error': 'Error',
    'Warning': 'Advertencia',
    'Loading': 'Cargando...',
    'Cancel': 'Cancelar',
    'Save': 'Guardar',
    'Delete': 'Eliminar',
    'Edit': 'Editar',
    'Back': 'Atrás',
    'Next': 'Siguiente',
  },
};

class I18nService {
  constructor() {
    this.currentLanguage = 'fr';
  }

  /**
   * Définir la langue active
   */
  setLanguage(language) {
    if (translations[language]) {
      this.currentLanguage = language;
    }
  }

  /**
   * Obtenir la langue active
   */
  getLanguage() {
    return this.currentLanguage;
  }

  /**
   *Traduire une clé
   */
  t(key) {
    return translations[this.currentLanguage]?.[key] || translations.fr[key] || key;
  }

  /**
   * Obtenir tous les langues disponibles
   */
  getAvailableLanguages() {
    return [
      { code: 'fr', name: 'Français' },
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español' },
    ];
  }

  /**
   * Formater une date selon la locale
   */
  formatDate(date, format = 'short') {
    const options = {
      short: { year: 'numeric', month: '2-digit', day: '2-digit' },
      long: { year: 'numeric', month: 'long', day: 'numeric' },
      time: { hour: '2-digit', minute: '2-digit' },
    };

    const locale = {
      fr: 'fr-FR',
      en: 'en-US',
      es: 'es-ES',
    }[this.currentLanguage];

    return new Date(date).toLocaleDateString(locale, options[format]);
  }

  /**
   * Formater une devise
   */
  formatCurrency(amount, currency = 'USD') {
    const locale = {
      fr: 'fr-FR',
      en: 'en-US',
      es: 'es-ES',
    }[this.currentLanguage];

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }
}

export default new I18nService();
