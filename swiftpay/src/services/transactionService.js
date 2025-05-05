// src/services/transactionService.js
import api from './api';

export default {
  list: filters =>
    api.get('/transactions', { params: filters }).then(r => r.data),

  create: payload =>
    api.post('/transactions', payload).then(r => r.data),

  clear: () =>
    api.post('/transactions/clear').then(r => r.data),
};

