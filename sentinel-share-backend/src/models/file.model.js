'use strict';

const { query } = require('../config/db');

async function create({ ownerId, originalName, storedKey, mimeType, sizeBytes }) {
  const result = await query(
    `INSERT INTO files (owner_id, original_name, stored_key, mime_type, size_bytes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, owner_id, original_name, mime_type, size_bytes, created_at`,
    [ownerId, originalName, storedKey, mimeType, sizeBytes]
  );
  return result.rows[0];
}

async function findByOwner(ownerId) {
  const result = await query(
    `SELECT id, original_name, mime_type, size_bytes, created_at
     FROM files
     WHERE owner_id = $1 AND is_deleted = false
     ORDER BY created_at DESC`,
    [ownerId]
  );
  return result.rows;
}

async function findById(id) {
  const result = await query(
    `SELECT id, owner_id, original_name, stored_key, mime_type, size_bytes, created_at
     FROM files
     WHERE id = $1 AND is_deleted = false`,
    [id]
  );
  return result.rows[0] || null;
}

async function softDelete(id, ownerId) {
  const result = await query(
    `UPDATE files SET is_deleted = true, updated_at = NOW()
     WHERE id = $1 AND owner_id = $2 AND is_deleted = false
     RETURNING id`,
    [id, ownerId]
  );
  return result.rows[0] || null;
}

module.exports = { create, findByOwner, findById, softDelete };
