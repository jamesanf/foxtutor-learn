-- Preserve unresolved commercial accounting decisions without treating them as invoice actions.
PRAGMA foreign_keys = OFF;

CREATE TABLE accounting_outbox_phase6_unresolved (
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
  action_type TEXT NOT NULL CHECK (action_type IN ('NO_ACTION', 'CREATE_INVOICE', 'UNRESOLVED')),
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

INSERT INTO accounting_outbox_phase6_unresolved
SELECT * FROM accounting_outbox;

DROP TABLE accounting_outbox;
ALTER TABLE accounting_outbox_phase6_unresolved RENAME TO accounting_outbox;

CREATE INDEX idx_accounting_outbox_due
  ON accounting_outbox(status, next_attempt_at, created_at);
CREATE INDEX idx_accounting_outbox_event
  ON accounting_outbox(event_type, business_event_id);
CREATE INDEX idx_accounting_outbox_lesson
  ON accounting_outbox(lesson_id, created_at DESC);
CREATE INDEX idx_accounting_outbox_student
  ON accounting_outbox(student_id, created_at DESC);
CREATE INDEX idx_accounting_outbox_external
  ON accounting_outbox(external_reference);

PRAGMA foreign_keys = ON;
