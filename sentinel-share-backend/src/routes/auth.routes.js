'use strict';

const { Router } = require('express');
const {
  signup,
  login,
  signupValidation,
  loginValidation,
} = require('../controllers/auth.controller');

const router = Router();

router.post('/signup', signupValidation, signup);
router.post('/login', loginValidation, login);

module.exports = router;
