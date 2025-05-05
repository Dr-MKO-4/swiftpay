// src/services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';    // ← lit la base URL depuis .env

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
});

// injecte automatiquement le JWT stocké sous la clé 'jwt'
API.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('jwt');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
