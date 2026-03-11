'use strict';

const { query } = require('../config/db');

async function create({ fileId, token, expiresAt, createdBy }) {
  const result = await query(
    `INSERT INTO shared_links (file_id, token, expires_at, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, file_id, token, expires_at, created_at`,
    [fileId, token, expiresAt, createdBy]
  );
  return result.rows[0];
}

/**
 * Finds a valid (non-expired) share link by token.
 * Returns null if not found or already expired.
 */
async function findValidByToken(token) {
  const result = await query(
    `SELECT sl.id, sl.file_id, sl.token, sl.expires_at,
            f.stored_key, f.original_name, f.mime_type, f.is_deleted
     FROM shared_links sl
     JOIN files f ON f.id = sl.file_id
     WHERE sl.token = $1
       AND sl.expires_at > NOW()
       AND f.is_deleted = false`,
    [token]
  );
  return result.rows[0] || null;
}

async function findByFileAndOwner(fileId, createdBy) {
  const result = await query(
    `SELECT id, file_id, token, expires_at, created_at
     FROM shared_links
     WHERE file_id = $1 AND created_by = $2
     ORDER BY created_at DESC`,
    [fileId, createdBy]
  );
  return result.rows;
}

module.exports = { create, findValidByToken, findByFileAndOwner };
