const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes         = require('./routes/auth');
const usersRoutes        = require('./routes/users');
const walletsRoutes      = require('./routes/walletsRoutes');
const transactionsRoutes = require('./routes/transactions');  // attention au nom
const faceController     = require('./controllers/faceController');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { authenticateJWT } = require('./middlewares/authMiddleware');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateJWT, usersRoutes);
app.use('/api/wallets', authenticateJWT, walletsRoutes);
app.use('/api/transactions', authenticateJWT, transactionsRoutes);
app.use('/api', faceController);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`)).timeout = 0;

