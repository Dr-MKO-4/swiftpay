// src/services/userService.js
import API from './api';

const UserService = {
  // créer un portefeuille lié à l'utilisateur
  createWallet: () =>
    API.post('/wallets').then(r => r.data),

  // récupérer le profil
  getProfile: () =>
    API.get('/users/profile').then(r => r.data),

  // mettre à jour le profil (préférences et infos)
  updateProfile: data =>
    API.put('/users/profile', data).then(r => r.data),

  // stocker le secret OTP
  saveOtpSecret: secret =>
    API.post('/otp-secrets', { secret }).then(r => r.data),

  // stocker la clé biométrique
  saveBiometricKey: (publicKey, deviceInfo) =>
    API.post('/biometric-keys', { publicKey, deviceInfo }).then(r => r.data),

  // mettre à jour les préférences utilisateur (alias si tu préfères)
  updatePreferences: prefs =>
    API.put('/users/preferences', prefs).then(r => r.data),
};

export default UserService;
