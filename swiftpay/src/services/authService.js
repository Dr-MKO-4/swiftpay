// src/services/authService.js
import API from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthService = {
  // 1. Inscription → retourne juste le token, NE stocke PLUS en AsyncStorage
  register: async (email, password, fullName, username, phone) => {
    const resp = await API.post('/auth/register', { email, password, fullName, username, phone });
    return resp.data;
  },

  // 2. Login → peut renvoyer otpRequired ou token
  login: async (email, password) => {
    const resp = await API.post('/auth/login', { email, password });
    if (resp.data.otpRequired) {
      return { otpRequired: true, email: resp.data.email };
    }
    await AsyncStorage.setItem('jwt', resp.data.token);
    return resp.data;
  },

  // 3. Demande OTP
  requestOtp: async email => {
    const resp = await API.post('/auth/request-otp', { email });
    return resp.data;
  },

  // 4. Vérification OTP → stocke token
// Vérification OTP pour login (ancienne)
 verifyOtp: async (email, otp) => {
   const resp = await API.post('/auth/verify-otp', { email, otp });
   await AsyncStorage.setItem('jwt', resp.data.token);
   return resp.data;
 },

 // Vérification OTP en inscription → NE STOCKE PAS le token
 verifySignupOtp: async (email, otp) => {
   const resp = await API.post('/auth/verify-otp', { email, otp });
   return resp.data;
 },



  // 5. Récupérer profil
  getProfile: () => API.get('/users/profile').then(r => r.data),

  // 6. Mise à jour préférences
  updatePreferences: (language, theme) =>
    API.post('/auth/preferences', { language, theme }).then(r => r.data),

  // 7. Enregistrement biométrique classique
  registerBiometric: (publicKey, deviceInfo) =>
    API.post('/auth/register-biometric', { publicKey, deviceInfo }).then(r => r.data),



  // 8. Variante pendant signup avec token temporaire
  registerBiometricWithToken: (publicKey, deviceInfo, token) =>
    API.post('/auth/register-biometric', { publicKey, deviceInfo }, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.data),

  // 9. Enregistrement Face ID
  registerFace: imageBase64 =>
    API.post('/auth/register-face', { image: imageBase64 }).then(r => r.data),

  registerFaceWithToken: (imageBase64, token) =>
    API.post('/auth/register-face', { image: imageBase64 }, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.data),
};

export default AuthService;
