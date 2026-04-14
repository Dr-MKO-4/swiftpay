const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Logger setup
const { logger } = require('./config/logger');
const httpLogger = require('./middlewares/httpLogger');

// Routes imports
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const walletsRoutes = require('./routes/walletsRoutes');
const transactionsRoutes = require('./routes/transactions');
const passwordResetRoutes = require('./routes/passwordReset');
const transferRoutes = require('./routes/transfers');
const beneficiaryRoutes = require('./routes/beneficiaries');
const currencyRoutes = require('./routes/currency');
const pdfRoutes = require('./routes/pdf');
const notificationRoutes = require('./routes/notifications');
const faceController = require('./controllers/faceController');

// Middleware imports
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { authenticateJWT } = require('./middlewares/authMiddleware');
const { generalLimiter, authLimiter, otpLimiter } = require('./middlewares/rateLimiter');
const { sessionTimeoutMiddleware, activityTrackingMiddleware } = require('./middlewares/sessionTimeout');
const { decryptMiddleware } = require('./middlewares/encryptionMiddleware');

const app = express();

// Middlewares globaux
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(httpLogger); // HTTP request logging
app.use(activityTrackingMiddleware); // Activity tracking
app.use(generalLimiter); // Rate limit général
app.use(decryptMiddleware); // Decrypt sensitive data

// Routes publiques avec rate limiting strict
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth', otpLimiter, passwordResetRoutes);

// Routes publiques (devises)
app.use('/api/currencies', currencyRoutes);
sessionTimeoutMiddleware, usersRoutes);
app.use('/api/wallets', authenticateJWT, sessionTimeoutMiddleware, walletsRoutes);
app.use('/api/transactions', authenticateJWT, sessionTimeoutMiddleware, transactionsRoutes);
app.use('/api/transfers', authenticateJWT, sessionTimeoutMiddleware, transferRoutes);
app.use('/api/beneficiaries', authenticateJWT, sessionTimeoutMiddleware, beneficiaryRoutes);
app.use('/api/pdf', authenticateJWT, sessionTimeoutMiddleware, pdfRoutes);
app.use('/api/notifications', authenticateJWT, sessionTimeoutMiddleware, beneficiaryRoutes);
app.use('/api/pdf', authenticateJWT, pdfRoutes);
app.use('/api/notifications', authenticateJWT, notificationRoutes);
app.use('/api', faceController);

// Healthcheck endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Gestion des erreurs
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

server.timeout = 0;

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

