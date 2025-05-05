const express = require('express');
const router  = express.Router();
const fetch   = require('node-fetch');
const { authenticateJWT } = require('../middlewares/authMiddleware');

// Proxy POST /api/verify_face vers le micro-service Python
router.post('/verify_face', authenticateJWT, async (req, res, next) => {
  try {
    // Envoi des images au service Flask
    const resp = await fetch(`${process.env.FACEID_URL || 'http://localhost:5001'}/verify_face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: req.body.images })
    });
    const json = await resp.json();
    if (resp.ok && json.success) {
      // On renvoie success au client mobile
      return res.json({ success: true, message: json.message });
    } else {
      return res.status(401).json({ success: false, message: json.message });
    }
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
