// src/routes/beneficiaries.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const beneficiaryService = require('../services/beneficiaryService');

const validators = {
  add: [
    body('beneficiaryUserId').isInt({ min: 1 }).withMessage('ID invalide'),
    body('nickname')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Surnom : 1-50 caractères'),
  ],
  update: [
    body('nickname')
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Surnom : 1-50 caractères'),
  ],
};

// POST / - Ajouter un bénéficiaire
router.post('/', authenticateJWT, validators.add, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const userId = req.user.id;
    const { beneficiaryUserId, nickname } = req.body;

    const result = await beneficiaryService.addBeneficiary(userId, beneficiaryUserId, nickname);
    return res.status(201).json(result);
  } catch (err) {
    if (err.message.includes('Bénéficiaire') || err.message.includes('yourself')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    return next(err);
  }
});

// GET / - Obtenir tous les bénéficiaires
router.get('/', authenticateJWT, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const beneficiaries = await beneficiaryService.getBeneficiaries(userId);
    return res.json({ success: true, data: beneficiaries });
  } catch (err) {
    return next(err);
  }
});

// PUT /:beneficiaryId - Mettre à jour le surnom
router.put('/:beneficiaryId', authenticateJWT, validators.update, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const userId = req.user.id;
    const { beneficiaryId } = req.params;
    const { nickname } = req.body;

    const result = await beneficiaryService.updateBeneficiaryNickname(
      userId,
      beneficiaryId,
      nickname
    );
    return res.json(result);
  } catch (err) {
    if (err.message.includes('Bénéficiaire')) {
      return res.status(404).json({ success: false, message: err.message });
    }
    return next(err);
  }
});

// DELETE /:beneficiaryId - Supprimer un bénéficiaire
router.delete('/:beneficiaryId', authenticateJWT, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { beneficiaryId } = req.params;

    const result = await beneficiaryService.removeBeneficiary(userId, beneficiaryId);
    return res.json(result);
  } catch (err) {
    if (err.message.includes('Bénéficiaire')) {
      return res.status(404).json({ success: false, message: err.message });
    }
    return next(err);
  }
});

module.exports = router;
