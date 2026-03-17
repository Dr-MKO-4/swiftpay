// src/services/transferService.js
const db = require('../config/db');

const TRANSFER_LIMITS = {
  daily: 5000,    // Limite quotidienne
  monthly: 50000, // Limite mensuelle
  single: 1000,   // Limite par transaction
};

// Vérifier les limites de transfert
exports.checkTransferLimits = async (userId, amount) => {
  const errors = [];

  // Vérifier limite unique
  if (amount > TRANSFER_LIMITS.single) {
    errors.push(`Montant max par transfert: ${TRANSFER_LIMITS.single}`);
  }

  // Vérifier limite quotidienne
  const dailyResult = await db.query(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE user_id = $1 AND type = 'transfer' AND status = 'completed'
     AND DATE(created_at) = CURRENT_DATE`,
    [userId]
  );

  const dailyTotal = parseFloat(dailyResult.rows[0].total);
  if (dailyTotal + amount > TRANSFER_LIMITS.daily) {
    errors.push(`Limite quotidienne dépassée. Restant: ${TRANSFER_LIMITS.daily - dailyTotal}`);
  }

  // Vérifier limite mensuelle
  const monthlyResult = await db.query(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE user_id = $1 AND type = 'transfer' AND status = 'completed'
     AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`,
    [userId]
  );

  const monthlyTotal = parseFloat(monthlyResult.rows[0].total);
  if (monthlyTotal + amount > TRANSFER_LIMITS.monthly) {
    errors.push(`Limite mensuelle dépassée. Restant: ${TRANSFER_LIMITS.monthly - monthlyTotal}`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  return true;
};

// Effectuer un transfert entre utilisateurs
exports.transferFunds = async (senderId, recipientId, amount, description = '') => {
  if (senderId === recipientId) {
    throw new Error('Impossible de transférer vers votre propre compte');
  }

  if (amount <= 0) {
    throw new Error('Montant invalide');
  }

  // Vérifier les limites
  await this.checkTransferLimits(senderId, amount);

  // Vérifier le solde
  const senderWallet = await db.query(
    'SELECT wallet_id, balance FROM wallets WHERE user_id = $1 AND currency = $2',
    [senderId, 'USD']
  );

  if (!senderWallet.rows.length || senderWallet.rows[0].balance < amount) {
    throw new Error('Solde insuffisant');
  }

  // Vérifier que le destinataire existe
  const recipientExists = await db.query(
    'SELECT wallet_id FROM wallets WHERE user_id = $1 AND currency = $2',
    [recipientId, 'USD']
  );

  if (!recipientExists.rows.length) {
    throw new Error('Destinataire introuvable');
  }

  const senderWalletId = senderWallet.rows[0].wallet_id;
  const recipientWalletId = recipientExists.rows[0].wallet_id;

  try {
    await db.query('BEGIN');

    // Débiter l'envoyeur
    await db.query(
      'UPDATE wallets SET balance = balance - $1 WHERE wallet_id = $2',
      [amount, senderWalletId]
    );

    // Créditer le destinataire
    await db.query(
      'UPDATE wallets SET balance = balance + $1 WHERE wallet_id = $2',
      [amount, recipientWalletId]
    );

    // Enregistrer transaction pour envoyeur
    const transferResult = await db.query(
      `INSERT INTO transactions 
       (wallet_id, type, amount, status, description, related_wallet_id)
       VALUES ($1, 'transfer', $2, 'completed', $3, $4)
       RETURNING transaction_id, created_at`,
      [senderWalletId, amount, `Transfer to user ${recipientId}: ${description}`, recipientWalletId]
    );

    // Enregistrer transaction pour destinataire
    await db.query(
      `INSERT INTO transactions 
       (wallet_id, type, amount, status, description, related_wallet_id)
       VALUES ($1, 'transfer_received', $2, 'completed', $3, $4)`,
      [recipientWalletId, amount, `Transfer from user ${senderId}: ${description}`, senderWalletId]
    );

    await db.query('COMMIT');

    return {
      success: true,
      message: 'Transfert effectué avec succès',
      transactionId: transferResult.rows[0].transaction_id,
      timestamp: transferResult.rows[0].created_at,
    };
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
};

// Obtenir les limites restantes de l'utilisateur
exports.getRemainingLimits = async (userId) => {
  const dailyResult = await db.query(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE user_id = $1 AND type = 'transfer' AND status = 'completed'
     AND DATE(created_at) = CURRENT_DATE`,
    [userId]
  );

  const monthlyResult = await db.query(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE user_id = $1 AND type IN ('transfer', 'transfer_received') AND status = 'completed'
     AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`,
    [userId]
  );

  const dailyUsed = parseFloat(dailyResult.rows[0].total);
  const monthlyUsed = parseFloat(monthlyResult.rows[0].total);

  return {
    daily: {
      limit: TRANSFER_LIMITS.daily,
      used: dailyUsed,
      remaining: Math.max(0, TRANSFER_LIMITS.daily - dailyUsed),
    },
    monthly: {
      limit: TRANSFER_LIMITS.monthly,
      used: monthlyUsed,
      remaining: Math.max(0, TRANSFER_LIMITS.monthly - monthlyUsed),
    },
    singleTransferMax: TRANSFER_LIMITS.single,
  };
};
