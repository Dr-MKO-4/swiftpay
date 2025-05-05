// src/routes/transaction.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateJWT } = require('../middlewares/authMiddleware');

// GET /api/transactions
router.get('/', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const { type, status, start_date, end_date } = req.query;
  const conditions = ['t.wallet_id IN (SELECT wallet_id FROM wallets WHERE user_id=$1)'];
  const params = [userId];
  let idx = 2;
  if (type)         { conditions.push(`t.type=$${idx++}`); params.push(type); }
  if (status)       { conditions.push(`t.status=$${idx++}`); params.push(status); }
  if (start_date)   { conditions.push(`t.created_at>=$${idx++}`); params.push(start_date); }
  if (end_date)     { conditions.push(`t.created_at<=$${idx++}`); params.push(end_date); }

  const sql = `
    SELECT t.*, w.currency
      FROM transactions t
      JOIN wallets w ON w.wallet_id = t.wallet_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY t.created_at DESC
  `;
  const { rows } = await db.query(sql, params);
  res.json(rows);
});

// POST /api/transactions
router.post('/', authenticateJWT, async (req, res) => {
  const { wallet_id, type, amount, status, description, related_wallet_id } = req.body;
  const { rows } = await db.query(
    `SELECT record_transaction($1,$2,$3,$4,$5,$6) AS transaction_id`,
    [wallet_id, type, amount, status, description, related_wallet_id]
  );
  res.status(201).json({ transaction_id: rows[0].transaction_id });
});

// POST /api/transactions/clear
router.post('/clear', authenticateJWT, async (req, res) => {
  await db.query(
    `DELETE FROM transactions WHERE wallet_id IN (SELECT wallet_id FROM wallets WHERE user_id=$1)`,
    [req.user.id]
  );
  res.json({ success: true });
});

module.exports = router;
