const jwt = require('jsonwebtoken');
const redis = require('../config/redis');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Check Redis blacklist (wrapped in try-catch to keep service available if Redis has a transient failure)
    let isBlacklisted = false;
    try {
      const result = await redis.get(`blacklist:${token}`);
      isBlacklisted = result === '1';
    } catch (redisErr) {
      console.error('Redis error while checking blacklist:', redisErr.message);
    }

    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token has been revoked. Please login again.' });
    }

    // Verify JWT access token
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired' });
    }
    return res.status(401).json({ error: 'Invalid access token' });
  }
};

module.exports = { authenticate };
