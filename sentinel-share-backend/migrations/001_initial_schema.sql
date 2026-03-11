-- SentinelShare initial schema
-- Run this once against the RDS PostgreSQL instance before deploying the backend.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
-- users
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ─────────────────────────────────────────
-- files
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS files (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id      UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    original_name TEXT        NOT NULL,
    stored_key    TEXT        NOT NULL UNIQUE,   -- opaque S3 object key
    mime_type     TEXT        NOT NULL,
    size_bytes    BIGINT      NOT NULL CHECK (size_bytes > 0),
    is_deleted    BOOLEAN     NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_owner_id   ON files (owner_id);
CREATE INDEX IF NOT EXISTS idx_files_is_deleted ON files (is_deleted);

-- ─────────────────────────────────────────
-- shared_links
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shared_links (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id       UUID        NOT NULL REFERENCES files (id) ON DELETE CASCADE,
    token         TEXT        NOT NULL UNIQUE,   -- 64-char hex, cryptographically random
    expires_at    TIMESTAMPTZ NOT NULL,
    created_by    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_links_token      ON shared_links (token);
CREATE INDEX IF NOT EXISTS idx_shared_links_expires_at ON shared_links (expires_at);

-- ─────────────────────────────────────────
-- updated_at auto-update trigger
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
