-- Phase 6 accounting integration boundary. FreeAgent remains the accounting authority.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounting_outbox (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('CANCELLATION_ACCOUNTING', 'RESCHEDULE_ACCOUNTING')),
  business_event_id TEXT NOT NULL,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  billing_consequence TEXT NOT NULL CHECK (billing_consequence IN (
    'NO_CHARGE',
    'CANCELLATION_PENDING_DECISION',
    'EXCEPTION_WAIVED',
    'ADMIN_CANCELLED',
    'RESCHEDULED'
  )),
  action_type TEXT NOT NULL CHECK (action_type IN ('NO_ACTION', 'CREATE_INVOICE')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'RETRYABLE', 'FAILED', 'UNKNOWN', 'NOT_REQUIRED')),
  idempotency_key TEXT NOT NULL UNIQUE,
  accounting_reference TEXT NOT NULL UNIQUE,
  accounting_effective_date TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TEXT,
  last_attempted_at TEXT,
  external_reference TEXT UNIQUE,
  external_url TEXT,
  external_resource_type TEXT,
  provider_status TEXT,
  safe_error_code TEXT,
  safe_error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE(event_type, business_event_id)
);

CREATE INDEX IF NOT EXISTS idx_accounting_outbox_due
  ON accounting_outbox(status, next_attempt_at, created_at);
CREATE INDEX IF NOT EXISTS idx_accounting_outbox_event
  ON accounting_outbox(event_type, business_event_id);
CREATE INDEX IF NOT EXISTS idx_accounting_outbox_lesson
  ON accounting_outbox(lesson_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounting_outbox_student
  ON accounting_outbox(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounting_outbox_external
  ON accounting_outbox(external_reference);

CREATE TABLE IF NOT EXISTS external_accounting_links (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider = 'FREEAGENT'),
  local_entity_type TEXT NOT NULL CHECK (local_entity_type = 'STUDENT'),
  local_entity_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  external_resource_type TEXT NOT NULL CHECK (external_resource_type = 'CONTACT'),
  external_reference TEXT NOT NULL,
  external_url TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(provider, local_entity_type, local_entity_id),
  UNIQUE(provider, external_reference)
);

CREATE TABLE IF NOT EXISTS accounting_connections (
  id TEXT PRIMARY KEY CHECK (id = 'FREEAGENT'),
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  company_subdomain TEXT,
  access_token_ciphertext TEXT,
  refresh_token_ciphertext TEXT,
  access_token_expires_at TEXT,
  refresh_token_expires_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('NOT_CONFIGURED', 'CONNECTED', 'ATTENTION', 'UNAVAILABLE')),
  last_success_at TEXT,
  last_error_code TEXT,
  last_error_message TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounting_oauth_states (
  state_hash TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  consumed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_accounting_oauth_states_expiry
  ON accounting_oauth_states(expires_at, consumed_at);
