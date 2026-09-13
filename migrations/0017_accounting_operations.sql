-- Phase 6.2 accounting operations: auditable retries and verified contact links.
PRAGMA foreign_keys = ON;

ALTER TABLE external_accounting_links ADD COLUMN status TEXT NOT NULL DEFAULT 'UNVERIFIED'
  CHECK (status IN ('UNVERIFIED', 'VERIFIED', 'INVALID'));
ALTER TABLE external_accounting_links ADD COLUMN verified_at TEXT;
ALTER TABLE external_accounting_links ADD COLUMN verified_environment TEXT
  CHECK (verified_environment IS NULL OR verified_environment IN ('sandbox', 'production'));
ALTER TABLE external_accounting_links ADD COLUMN verified_company_subdomain TEXT;
ALTER TABLE external_accounting_links ADD COLUMN last_error_code TEXT;
ALTER TABLE external_accounting_links ADD COLUMN last_error_message TEXT;

CREATE TABLE IF NOT EXISTS accounting_retry_audit (
  id TEXT PRIMARY KEY,
  outbox_id TEXT REFERENCES accounting_outbox(id) ON DELETE SET NULL,
  business_event_id TEXT,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL CHECK (actor_role = 'ADMIN'),
  prior_status TEXT NOT NULL,
  request_result TEXT NOT NULL CHECK (request_result IN ('ACCEPTED', 'REJECTED')),
  resulting_status TEXT,
  provider_reference TEXT,
  safe_error_code TEXT,
  safe_error_message TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_accounting_retry_audit_outbox
  ON accounting_retry_audit(outbox_id, created_at DESC);
