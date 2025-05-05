// src/contexts/AuthContext.js

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/authService';
import NFCService from '../services/nfcService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [profile,   setProfile]   = useState(null);
  const [loading,   setLoading]   = useState(true);

  // 0) initialisation NFC
  useEffect(() => {
    NFCService.init().catch(() => console.warn('NFC init failed'));
    return () => { NFCService.stop(); };
  }, []);

  // 1) charger token + profil au démarrage
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('jwt');
      if (token) {
        setUserToken(token);
        const prof = await AuthService.getProfile();
        if (prof.success) setProfile(prof.data);
      }
      setLoading(false);
    })();
  }, []);

  // 2) purge token quand app passe en background
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background') {
        AsyncStorage.removeItem('jwt');
        setUserToken(null);
        setProfile(null);
      }
    });
    return () => sub.remove();
  }, []);

  // 3) Inscription (ne stocke pas le JWT immédiatement)
  const register = (email, password, fullName, username, phone) =>
    AuthService.register(email, password, fullName, username, phone);

  // 4) Login (peut renvoyer otpRequired)
  const login = (email, password) =>
    AuthService.login(email, password);

  // 5) Demande OTP
  const requestOtp = email =>
    AuthService.requestOtp(email);

  // 6) Vérification OTP (stocke le JWT)
  const verifyOtp = async (email, otp) => {
    const res = await AuthService.verifyOtp(email, otp);
    if (res.success && res.token) {
      await AsyncStorage.setItem('jwt', res.token);
      setUserToken(res.token);
      const prof = await AuthService.getProfile();
      if (prof.success) setProfile(prof.data);
    }
    return res;
  };
  const verifySignupOtp = async (email, otp) => {
    return AuthService.verifySignupOtp(email, otp);
  };


  // 7) Confirmation finale du signup : on stocke le JWT du signup
  const confirmSignup = async signupToken => {
    await AsyncStorage.setItem('jwt', signupToken);
    setUserToken(signupToken);
    const prof = await AuthService.getProfile();
    if (prof.success) setProfile(prof.data);
  };

  // 8) Biometric registration
  const registerBiometric = (publicKey, deviceInfo) =>
    AuthService.registerBiometric(publicKey, deviceInfo);

  // 9) Variante biometric with token
  const registerBiometricWithToken = (publicKey, deviceInfo, token) =>
    AuthService.registerBiometricWithToken(publicKey, deviceInfo, token);

  const registerFaceWithToken = imageBase64 =>
    AuthService.registerFaceWithToken(imageBase64, signupToken);

  // 10) Mise à jour des préférences
  const updatePreferences = async (language, theme) => {
    const res = await AuthService.updatePreferences(language, theme);
    if (!res.success) throw new Error(res.message || 'Erreur maj préférences');
    return res.data;
  };

  // Logout
  const logout = async () => {
    await AsyncStorage.removeItem('jwt');
    setUserToken(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      loading,
      userToken,
      profile,
      register,
      login,
      requestOtp,
      verifyOtp,
      confirmSignup,
      registerBiometric,
      registerBiometricWithToken,
      registerFaceWithToken,
      verifySignupOtp,
      updatePreferences,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
