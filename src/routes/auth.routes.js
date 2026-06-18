const express = require('express');
const router = express.Router();
const { register, login, refresh, logout } = require('../controllers/auth.controller');
const { authLimiter } = require('../middleware/rateLimiter');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);

module.exports = router;
