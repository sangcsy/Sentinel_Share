'use strict';

const { validationResult } = require('express-validator');

/**
 * Reads express-validator results and short-circuits with 400 if invalid.
 * Place after validation chain middleware.
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

module.exports = { validateRequest };
