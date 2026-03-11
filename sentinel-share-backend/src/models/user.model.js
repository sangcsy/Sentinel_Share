'use strict';

const { query } = require('../config/db');

async function findByEmail(email) {
  const result = await query(
    'SELECT id, email, password_hash, role, created_at FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await query(
    'SELECT id, email, role, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function create({ email, passwordHash, role = 'user' }) {
  const result = await query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, $3)
     RETURNING id, email, role, created_at`,
    [email, passwordHash, role]
  );
  return result.rows[0];
}

module.exports = { findByEmail, findById, create };
