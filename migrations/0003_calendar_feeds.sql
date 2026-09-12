-- Phase 2.4 private calendar subscriptions. Apply forward-only.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS calendar_feeds (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_last4 TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  last_rotated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_feeds_active_owner
  ON calendar_feeds(owner_user_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_feeds_token_hash ON calendar_feeds(token_hash);
