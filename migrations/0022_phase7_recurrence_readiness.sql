-- Phase 7.1 recurring lesson authority, bounded materialisation and readiness.
-- Apply forward-only; do not edit after production use.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS recurring_lesson_series (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  payer_student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  tutor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  local_start_time TEXT NOT NULL CHECK (local_start_time GLOB '[0-2][0-9]:[0-5][0-9]'),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 1 AND 1440),
  timezone TEXT NOT NULL,
  recurrence_rule TEXT NOT NULL CHECK (recurrence_rule = 'WEEKLY'),
  start_date TEXT NOT NULL,
  end_date TEXT,
  price_minor INTEGER NOT NULL CHECK (price_minor > 0),
  currency TEXT NOT NULL CHECK (currency = 'GBP'),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recurring_series_active
  ON recurring_lesson_series(status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_recurring_series_student
  ON recurring_lesson_series(student_id, status, start_date);

CREATE TABLE IF NOT EXISTS recurring_lesson_pauses (
  id TEXT PRIMARY KEY,
  series_id TEXT NOT NULL REFERENCES recurring_lesson_series(id) ON DELETE RESTRICT,
  starts_on TEXT NOT NULL,
  ends_on TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  CHECK (starts_on <= ends_on),
  UNIQUE(series_id, starts_on, ends_on)
);

CREATE INDEX IF NOT EXISTS idx_recurring_series_pauses
  ON recurring_lesson_pauses(series_id, starts_on, ends_on);

CREATE TABLE IF NOT EXISTS recurring_series_history (
  id TEXT PRIMARY KEY,
  series_id TEXT NOT NULL REFERENCES recurring_lesson_series(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'CREATED', 'UPDATED', 'PAUSED', 'RESUMED', 'ENDED', 'CANCELLED'
  )),
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recurring_series_history
  ON recurring_series_history(series_id, created_at DESC, id DESC);

ALTER TABLE lessons ADD COLUMN recurring_series_id TEXT REFERENCES recurring_lesson_series(id) ON DELETE SET NULL;
ALTER TABLE lessons ADD COLUMN recurrence_key TEXT;
ALTER TABLE lessons ADD COLUMN series_revision INTEGER;
ALTER TABLE lessons ADD COLUMN series_instance INTEGER NOT NULL DEFAULT 0 CHECK (series_instance IN (0, 1));
ALTER TABLE lessons ADD COLUMN instance_override INTEGER NOT NULL DEFAULT 0 CHECK (instance_override IN (0, 1));

CREATE UNIQUE INDEX IF NOT EXISTS idx_lessons_series_occurrence
  ON lessons(recurring_series_id, recurrence_key)
  WHERE recurring_series_id IS NOT NULL AND recurrence_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_series_future
  ON lessons(recurring_series_id, start_at, status);

CREATE TABLE IF NOT EXISTS billing_payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES billing_invoices(id) ON DELETE RESTRICT,
  method TEXT NOT NULL CHECK (method = 'FREEAGENT_GOCARDLESS'),
  status TEXT NOT NULL CHECK (status IN (
    'NOT_STARTED', 'SCHEDULED', 'PENDING', 'CONFIRMED', 'FAILED', 'UNKNOWN'
  )),
  provider_reference TEXT,
  provider_status TEXT,
  collection_date TEXT NOT NULL,
  first_payment INTEGER NOT NULL DEFAULT 0 CHECK (first_payment IN (0, 1)),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_payments_status
  ON billing_payments(status, collection_date, updated_at);

CREATE TABLE IF NOT EXISTS billing_invoice_operations (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES billing_invoices(id) ON DELETE RESTRICT,
  operation_type TEXT NOT NULL CHECK (operation_type IN (
    'CREATE_INVOICE', 'INITIATE_DIRECT_DEBIT', 'RECONCILE'
  )),
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN (
    'PENDING', 'PROCESSING', 'SUCCEEDED', 'RETRYABLE', 'FAILED', 'UNKNOWN', 'BLOCKED'
  )),
  provider_reference TEXT,
  provider_url TEXT,
  provider_status TEXT,
  safe_error_code TEXT,
  safe_error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE(invoice_id, operation_type)
);

CREATE INDEX IF NOT EXISTS idx_billing_invoice_operations_due
  ON billing_invoice_operations(status, next_attempt_at, created_at);

CREATE TABLE IF NOT EXISTS billing_alerts (
  id TEXT PRIMARY KEY,
  deduplication_key TEXT NOT NULL UNIQUE,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'INVOICE_CREATION_FAILURE',
    'PROVIDER_TIMEOUT',
    'UNKNOWN_INVOICE_STATE',
    'CREDIT_RECONCILIATION_FAILURE',
    'MANDATE_INACTIVE',
    'COLLECTION_FAILURE',
    'PAYMENT_UNKNOWN',
    'PAYMENT_NOT_SECURED',
    'INVOICE_NOT_CREATED',
    'CREDIT_APPLICATION_FAILURE',
    'DUPLICATE_BILLING_EVENT',
    'RECONCILIATION_REQUIRED'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
  student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  payer_student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  billing_event_id TEXT REFERENCES billing_events(id) ON DELETE SET NULL,
  invoice_id TEXT REFERENCES billing_invoices(id) ON DELETE SET NULL,
  provider_reference TEXT,
  current_state TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_billing_alerts_open
  ON billing_alerts(status, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_alerts_lesson
  ON billing_alerts(lesson_id, created_at DESC);
