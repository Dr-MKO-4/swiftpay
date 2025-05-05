// src/middlewares/authMiddleware.js

const { verifyToken } = require('../services/jwtService'); // Modified: updated path

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Token missing' });

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ message: 'Invalid auth format' });

  const user = verifyToken(token);
  if (!user) return res.status(401).json({ message: 'Invalid or expired token' });

  req.user = user;
  next();
}

module.exports = { authenticateJWT };
