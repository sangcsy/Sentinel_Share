'use strict';

const { Router } = require('express');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  signup,
  login,
  signupValidation,
  loginValidation,
} = require('../controllers/auth.controller');

const router = Router();

router.post('/signup', authLimiter, signupValidation, signup);
router.post('/login', authLimiter, loginValidation, login);

module.exports = router;
