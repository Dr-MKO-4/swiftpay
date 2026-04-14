// src/routes/pdf.js
const express = require('express');
const { param, validationResult } = require('express-validator');
const path = require('path');
const authMiddleware = require('../middlewares/authMiddleware');
const pdfService = require('../services/pdfService');
const db = require('../config/db');
const { logger } = require('../config/logger');

const router = express.Router();

// Toutes les routes PDF nécessitent l'authentification
router.use(authMiddleware);

/**
 * GET /api/pdf/transaction/:transactionId
 * Télécharger le reçu d'une transaction
 */
router.get('/transaction/:transactionId', async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;

    // Vérifier que la transaction appartient à l'utilisateur
    const txnResult = await db.query(
      `SELECT * FROM transactions 
       WHERE transaction_id = $1 
       AND (sender_id = $2 OR receiver_id = $2)`,
      [transactionId, userId]
    );

    if (txnResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = txnResult.rows[0];

    // Récupérer les infos utilisateur
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    // Générer le PDF
    const { filename, filepath } = await pdfService.generateTransactionReceipt(transaction, user);

    // Envoyer le fichier
    res.download(filepath, `receipt_${transactionId}.pdf`, (err) => {
      if (err) logger.error(`Download error: ${err.message}`);
      // Optionnel: supprimer après envoi
      // pdfService.deleteTempFile(filename);
    });
  } catch (error) {
    logger.error(`Error generating transaction receipt: ${error.message}`);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

/**
 * GET /api/pdf/statement/:year/:month
 * Télécharger le relevé mensuel
 */
router.get('/statement/:year/:month', async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const userId = req.user.id;

    // Valider l'année et le mois
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }

    // Récupérer les transactions du mois
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

    const txnResult = await db.query(
      `SELECT * FROM transactions
       WHERE (sender_id = $1 OR receiver_id = $1)
       AND created_at BETWEEN $2 AND $3
       ORDER BY created_at DESC`,
      [userId, startDate, endDate]
    );

    // Récupérer les infos utilisateur
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    // Générer le PDF
    const { filename, filepath } = await pdfService.generateMonthlyStatement(
      txnResult.rows,
      user,
      monthNum,
      yearNum
    );

    // Envoyer le fichier
    res.download(filepath, `statement_${yearNum}_${monthNum}.pdf`, (err) => {
      if (err) logger.error(`Download error: ${err.message}`);
    });
  } catch (error) {
    logger.error(`Error generating statement: ${error.message}`);
    res.status(500).json({ error: 'Failed to generate statement' });
  }
});

/**
 * GET /api/pdf/annual/:year
 * Télécharger le relevé annuel
 */
router.get('/annual/:year', async (req, res, next) => {
  try {
    const { year } = req.params;
    const userId = req.user.id;

    const yearNum = parseInt(year);
    if (isNaN(yearNum)) {
      return res.status(400).json({ error: 'Invalid year' });
    }

    // Récupérer les transactions de l'année
    const startDate = new Date(yearNum, 0, 1);
    const endDate = new Date(yearNum, 11, 31, 23, 59, 59);

    const txnResult = await db.query(
      `SELECT * FROM transactions
       WHERE (sender_id = $1 OR receiver_id = $1)
       AND created_at BETWEEN $2 AND $3
       ORDER BY created_at DESC`,
      [userId, startDate, endDate]
    );

    // Récupérer les infos utilisateur
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    // Générer le PDF (utiliser serviceGenerateMontlyStatement pour l'année entière)
    const { filename, filepath } = await pdfService.generateMonthlyStatement(
      txnResult.rows,
      user,
      'Full Year',
      yearNum
    );

    // Envoyer le fichier
    res.download(filepath, `statement_annual_${yearNum}.pdf`, (err) => {
      if (err) logger.error(`Download error: ${err.message}`);
    });
  } catch (error) {
    logger.error(`Error generating annual statement: ${error.message}`);
    res.status(500).json({ error: 'Failed to generate annual statement' });
  }
});

module.exports = router;
