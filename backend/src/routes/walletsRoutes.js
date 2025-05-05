// src/routes/walletsRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateJWT } = require('../middlewares/authMiddleware');

// GET /api/wallets
router.get('/', authenticateJWT, async (req, res) => {
  const { rows } = await db.query(
    `SELECT wallet_id, currency, balance, created_at
       FROM wallets WHERE user_id=$1`,
    [req.user.id]
  );
  res.json(rows);
});

// POST /api/wallets
router.post('/', authenticateJWT, async (req, res) => {
  const { currency } = req.body;
  const { rows } = await db.query(
    'SELECT create_wallet($1,$2) AS wallet_id',
    [req.user.id, currency]
  );
  res.status(201).json({ wallet_id: rows[0].wallet_id });
});

// POST /api/wallets/deposit
router.post('/deposit', authenticateJWT, async (req, res) => {
  const { wallet_id, amount } = req.body;
  const userId = req.user.id;

  // Vérification d’appartenance
  const { rows: chk } = await db.query(
    'SELECT 1 FROM wallets WHERE wallet_id=$1 AND user_id=$2',
    [wallet_id, userId]
  );
  if (!chk.length) return res.status(403).json({ error: 'Unauthorized' });

  // Mise à jour du solde
  const { rows: updated } = await db.query(
    `UPDATE wallets SET balance = balance + $1
      WHERE wallet_id = $2
    RETURNING wallet_id, currency, balance, created_at`,
    [amount, wallet_id]
  );

  // Création de la transaction deposit
  const { rows: tx } = await db.query(
    `SELECT record_transaction($1,'deposit',$2,'success','Dépôt',NULL) AS transaction_id`,
    [wallet_id, amount]
  );

  res.json({
    wallet: updated[0],
    transaction_id: tx[0].transaction_id
  });
});

module.exports = router;
