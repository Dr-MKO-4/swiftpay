const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes         = require('./routes/auth');
const usersRoutes        = require('./routes/users');
const walletsRoutes      = require('./routes/walletsRoutes');
const transactionsRoutes = require('./routes/transactions');
const passwordResetRoutes = require('./routes/passwordReset');
const transferRoutes = require('./routes/transfers');
const beneficiaryRoutes = require('./routes/beneficiaries');
const faceController     = require('./controllers/faceController');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { authenticateJWT } = require('./middlewares/authMiddleware');
const { generalLimiter, authLimiter, otpLimiter } = require('./middlewares/rateLimiter');

const app = express();

// Middlewares globaux
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(generalLimiter); // Rate limit général

// Routes publiques avec rate limiting strict
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth', otpLimiter, passwordResetRoutes);

// Routes protégées
app.use('/api/users', authenticateJWT, usersRoutes);
app.use('/api/wallets', authenticateJWT, walletsRoutes);
app.use('/api/transactions', authenticateJWT, transactionsRoutes);
app.use('/api/transfers', authenticateJWT, transferRoutes);
app.use('/api/beneficiaries', authenticateJWT, beneficiaryRoutes);
app.use('/api', faceController);

// Healthcheck endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Gestion des erreurs
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`)).timeout = 0;

