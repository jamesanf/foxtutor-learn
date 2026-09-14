-- Phase 7.6 Direct Debit-first customer provisioning and bounded sentinel state.
-- Sensitive bank and mandate authorisation data remains provider-side.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS billing_accounts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL UNIQUE REFERENCES students(id) ON DELETE RESTRICT,
  payment_method TEXT NOT NULL DEFAULT 'DIRECT_DEBIT' CHECK (payment_method = 'DIRECT_DEBIT'),
  mandate_state TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (mandate_state IN (
    'NOT_CONFIGURED', 'SETUP_REQUIRED', 'AUTHORISATION_PENDING', 'ACTIVE',
    'FAILED', 'INACTIVE', 'UNKNOWN'
  )),
  provisioning_state TEXT NOT NULL DEFAULT 'CONTACT_SYNC_REQUIRED' CHECK (provisioning_state IN (
    'CONTACT_SYNC_REQUIRED', 'SETUP_REQUIRED', 'AUTHORISATION_PENDING',
    'ACTIVE', 'FAILED', 'INACTIVE', 'UNKNOWN'
  )),
  provider_contact_reference TEXT,
  provider_contact_url TEXT,
  verified_at TEXT,
  last_reconciled_at TEXT,
  last_notification_at TEXT,
  notification_count INTEGER NOT NULL DEFAULT 0 CHECK (notification_count >= 0),
  next_reconcile_at TEXT,
  claim_expires_at TEXT,
  last_error_code TEXT,
  last_error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_accounts_due
  ON billing_accounts(provisioning_state, next_reconcile_at, claim_expires_at);

CREATE TABLE IF NOT EXISTS billing_provisioning_events (
  id TEXT PRIMARY KEY,
  billing_account_id TEXT NOT NULL REFERENCES billing_accounts(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'ACCOUNT_CREATED', 'CONTACT_FOUND', 'CONTACT_CREATED', 'CONTACT_SYNC_FAILED',
    'MANDATE_STATE_CHANGED', 'SETUP_NOTIFICATION_SENT', 'SETUP_REMINDER_SENT'
  )),
  safe_detail TEXT NOT NULL DEFAULT '',
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_provisioning_events_account
  ON billing_provisioning_events(billing_account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS billing_emergency_payg_overrides (
  id TEXT PRIMARY KEY,
  billing_event_id TEXT NOT NULL UNIQUE REFERENCES billing_events(id) ON DELETE RESTRICT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (length(trim(reason)) >= 10),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'RESOLVED')),
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_emergency_payg_status
  ON billing_emergency_payg_overrides(status, created_at DESC);

CREATE TABLE IF NOT EXISTS billing_sentinel_runs (
  id TEXT PRIMARY KEY,
  business_date TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('RUNNING', 'PASSED', 'FAILED')),
  check_count INTEGER NOT NULL DEFAULT 0 CHECK (check_count >= 0),
  failure_count INTEGER NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  safe_error_code TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS billing_sentinel_alerts (
  id TEXT PRIMARY KEY,
  diagnostic_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'RESOLVED')),
  safe_context TEXT NOT NULL DEFAULT '',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  occurrence_count INTEGER NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
  resolved_at TEXT
);

-- Existing verified mappings become customer-level Direct Debit accounts without
-- copying any provider payload or sensitive payment information.
INSERT INTO billing_accounts (
  id, student_id, payment_method, mandate_state, provisioning_state,
  provider_contact_reference, provider_contact_url, verified_at,
  last_reconciled_at, created_at, updated_at
)
SELECT
  'billing-account:' || s.id,
  s.id,
  'DIRECT_DEBIT',
  'UNKNOWN',
  'CONTACT_SYNC_REQUIRED',
  CASE WHEN e.external_reference IS NOT NULL THEN e.external_reference END,
  CASE WHEN e.external_url IS NOT NULL THEN e.external_url END,
  e.verified_at,
  NULL,
  s.created_at,
  s.updated_at
FROM students s
LEFT JOIN external_accounting_links e
  ON e.local_entity_type = 'STUDENT'
 AND e.local_entity_id = s.id
 AND e.provider = 'FREEAGENT'
 AND e.external_resource_type = 'CONTACT'
 AND e.status = 'VERIFIED'
WHERE NOT EXISTS (
  SELECT 1 FROM billing_accounts b WHERE b.student_id = s.id
);
