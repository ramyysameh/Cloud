-- CloudPaste database initialization.
-- Files in /docker-entrypoint-initdb.d run once when PostgreSQL creates a fresh data directory.

-- pgcrypto provides gen_random_uuid(), used as a safe default if the API does not supply an id.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    language VARCHAR(50) NOT NULL DEFAULT 'plaintext',
    password_hash VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- The primary key already creates an index on id, but this explicit index documents the requirement.
CREATE INDEX IF NOT EXISTS idx_notes_id ON notes (id);

-- Speeds up recent-paste lookups and supports maintenance jobs that may purge expired notes later.
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes (created_at);