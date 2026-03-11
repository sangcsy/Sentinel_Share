'use strict';

const env = require('../config/env');

const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'pdf', 'txt', 'zip',
]);

/**
 * Validates file before it is uploaded to S3.
 * Checks MIME type against whitelist, extension against whitelist, and size.
 *
 * @param {Express.Multer.File} file
 * @returns {{ valid: boolean, error?: string }}
 */
function validateFile(file) {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // MIME type check
  if (!env.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return { valid: false, error: `File type not allowed: ${file.mimetype}` };
  }

  // Extension check — defence-in-depth against MIME spoofing
  const ext = (file.originalname.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `File extension not allowed: .${ext}` };
  }

  // Size check
  if (file.size > env.MAX_FILE_SIZE_BYTES) {
    const maxMb = env.MAX_FILE_SIZE_BYTES / (1024 * 1024);
    return { valid: false, error: `File exceeds maximum size of ${maxMb}MB` };
  }

  return { valid: true };
}

module.exports = { validateFile };
