-- Phase 7.2 global business-time invariant and billing operations audit.
-- FoxTutor business scheduling is always Europe/London. Historical values are
-- normalised forward-only before the write guards are installed.
PRAGMA foreign_keys = ON;

UPDATE lessons SET timezone = 'Europe/London' WHERE timezone IS NULL OR timezone <> 'Europe/London';

UPDATE recurring_lesson_series SET timezone = 'Europe/London'
WHERE timezone IS NULL OR timezone <> 'Europe/London';

CREATE TRIGGER IF NOT EXISTS lessons_timezone_europe_london_insert
BEFORE INSERT ON lessons
WHEN NEW.timezone <> 'Europe/London'
BEGIN
  SELECT RAISE(ABORT, 'FoxTutor lessons must use Europe/London');
END;

CREATE TRIGGER IF NOT EXISTS lessons_timezone_europe_london_update
BEFORE UPDATE OF timezone ON lessons
WHEN NEW.timezone <> 'Europe/London'
BEGIN
  SELECT RAISE(ABORT, 'FoxTutor lessons must use Europe/London');
END;

CREATE TRIGGER IF NOT EXISTS recurring_series_timezone_europe_london_insert
BEFORE INSERT ON recurring_lesson_series
WHEN NEW.timezone <> 'Europe/London'
BEGIN
  SELECT RAISE(ABORT, 'FoxTutor recurring series must use Europe/London');
END;

CREATE TRIGGER IF NOT EXISTS recurring_series_timezone_europe_london_update
BEFORE UPDATE OF timezone ON recurring_lesson_series
WHEN NEW.timezone <> 'Europe/London'
BEGIN
  SELECT RAISE(ABORT, 'FoxTutor recurring series must use Europe/London');
END;

ALTER TABLE billing_alerts ADD COLUMN acknowledged_at TEXT;
ALTER TABLE billing_alerts ADD COLUMN acknowledged_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE billing_alerts ADD COLUMN resolved_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE billing_alerts ADD COLUMN resolution_note TEXT;

CREATE INDEX IF NOT EXISTS idx_billing_alerts_acknowledged
  ON billing_alerts(status, acknowledged_at, updated_at DESC);

CREATE TABLE IF NOT EXISTS billing_reconciliation_tasks (
  id TEXT PRIMARY KEY,
  task_type TEXT NOT NULL CHECK (task_type IN (
    'INVOICE_STATUS',
    'PAYMENT_STATUS',
    'DIRECT_DEBIT_STATUS',
    'CREDIT_NOTE_STATUS',
    'CREDIT_APPLICATION',
    'CONTACT_MAPPING'
  )),
  student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  billing_event_id TEXT REFERENCES billing_events(id) ON DELETE SET NULL,
  invoice_id TEXT REFERENCES billing_invoices(id) ON DELETE SET NULL,
  credit_id TEXT REFERENCES customer_credits(id) ON DELETE SET NULL,
  provider_reference TEXT,
  deduplication_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'BLOCKED')),
  safe_error_code TEXT,
  safe_error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_billing_reconciliation_tasks_due
  ON billing_reconciliation_tasks(status, next_attempt_at, created_at);

CREATE TABLE IF NOT EXISTS billing_alert_events (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL REFERENCES billing_alerts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('CREATED', 'ACKNOWLEDGED', 'RESOLVED', 'REOPENED')),
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_alert_events_alert
  ON billing_alert_events(alert_id, created_at DESC);
