// remplace ton ancien biometricService.js par celui-ci

import ReactNativeBiometrics from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics();

const BiometricService = {
  /** 
   * Vérifie si un capteur biométrique est disponible.
   * @returns {Promise<{ available: boolean, biometryType: string }>}
   */
  isSupported: async () => {
    try {
      const result = await rnBiometrics.isSensorAvailable();
      // result = { available: true/false, biometryType: 'TouchID'|'FaceID'|'Biometrics' }
      return result;
    } catch (e) {
      return { available: false, biometryType: null };
    }
  },

  /**
   * Génère une paire de clés publique/privée stockée dans le keystore.
   * Utile pour l’enregistrement biométrique côté serveur.
   */
  createKeys: () => rnBiometrics.createKeys(),

  /**
   * Affiche la fenêtre d’authentification biométrique.
   * @param {string} promptMessage
   * @returns {Promise<{ success: boolean, signature?: string, keyId?: string }>}
   */
  simplePrompt: (promptMessage = 'Authenticate') =>
    rnBiometrics.simplePrompt({ promptMessage }),
};

export default BiometricService;
