// src/services/walletService.js
import api from './api';

export default {
  list: () =>
    api.get('/wallets').then(res => res.data),

  create: currency =>
    api.post('/wallets', { currency }).then(res => res.data),

  deposit: (walletId, amount) =>
    api.post('/wallets/deposit', { wallet_id: walletId, amount }).then(res => res.data),
};

