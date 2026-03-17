// src/routes/transfers.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const transferService = require('../services/transferService');

const validators = {
  transfer: [
    body('recipientId').isInt({ min: 1 }).withMessage('ID destinataire invalide'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Montant invalide'),
    body('description')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Description max 200 caractères'),
  ],
};

// POST / - Effectuer un transfert
router.post('/', authenticateJWT, validators.transfer, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { recipientId, amount, description } = req.body;
    const senderId = req.user.id;

    const result = await transferService.transferFunds(
      senderId,
      recipientId,
      amount,
      description
    );

    return res.json(result);
  } catch (err) {
    if (err.message.includes('Limite') || err.message.includes('Solde') || 
        err.message.includes('Destinataire') || err.message.includes('propre')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    return next(err);
  }
});

// GET /limits - Obtenir les limites restantes
router.get('/limits', authenticateJWT, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limits = await transferService.getRemainingLimits(userId);
    return res.json({ success: true, data: limits });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
