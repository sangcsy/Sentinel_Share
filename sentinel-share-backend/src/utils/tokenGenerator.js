'use strict';

const { randomBytes } = require('crypto');

/**
 * Generates a cryptographically random, URL-safe share token.
 * 32 bytes → 64 hex chars. Unpredictable and collision-resistant.
 */
function generateShareToken() {
  return randomBytes(32).toString('hex');
}

/**
 * Generates a UUID-based S3 object key to avoid exposing original filenames
 * and prevent path traversal or enumeration attacks.
 *
 * Format: uploads/<uuid>/<sanitized-filename>
 */
function generateStoredKey(originalName) {
  const { v4: uuidv4 } = require('uuid');
  const safeFileName = originalName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 200);
  return `uploads/${uuidv4()}/${safeFileName}`;
}

module.exports = { generateShareToken, generateStoredKey };
