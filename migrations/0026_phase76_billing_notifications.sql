-- Extend the existing notification outbox for Direct Debit provisioning.
PRAGMA foreign_keys = OFF;

ALTER TABLE notifications RENAME TO notifications_phase76;

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'STUDENT_INVITED',
    'LESSON_CREATED',
    'LESSON_CHANGED',
    'LESSON_REMINDER',
    'RESOURCE_ADDED',
    'CANCELLATION_PROCESSED',
    'CANCELLATION_REQUESTED',
    'CANCELLATION_APPROVED',
    'CANCELLATION_REJECTED',
    'LESSON_RESCHEDULED',
    'LESSON_REPORT',
    'DST_WARNING',
    'BILLING_DIRECT_DEBIT_SETUP',
    'BILLING_DIRECT_DEBIT_REMINDER'
  )),
  event_id TEXT NOT NULL,
  recipient_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  student_id TEXT REFERENCES students(id) ON DELETE RESTRICT,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE RESTRICT,
  resource_id TEXT REFERENCES resources(id) ON DELETE RESTRICT,
  report_id TEXT REFERENCES lesson_reports(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'SENDING', 'SENT', 'UNKNOWN', 'FAILED', 'SUPPRESSED')),
  idempotency_key TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  text_body TEXT NOT NULL,
  html_body TEXT NOT NULL,
  provider_reference TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  error_category TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sent_at TEXT,
  last_attempted_at TEXT,
  scheduled_at TEXT,
  next_attempt_at TEXT
);

INSERT INTO notifications
SELECT * FROM notifications_phase76;

DROP TABLE notifications_phase76;

CREATE INDEX IF NOT EXISTS idx_notifications_status_attempt
  ON notifications(status, next_attempt_at, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notifications_event
  ON notifications(event_type, event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON notifications(recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_lesson
  ON notifications(lesson_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_resource
  ON notifications(resource_id, created_at DESC);

ALTER TABLE notification_settings RENAME TO notification_settings_phase76;

CREATE TABLE notification_settings (
  event_type TEXT PRIMARY KEY CHECK (event_type IN (
    'STUDENT_INVITED',
    'LESSON_CREATED',
    'LESSON_CHANGED',
    'LESSON_REMINDER',
    'RESOURCE_ADDED',
    'CANCELLATION_PROCESSED',
    'CANCELLATION_REQUESTED',
    'CANCELLATION_APPROVED',
    'CANCELLATION_REJECTED',
    'LESSON_RESCHEDULED',
    'LESSON_REPORT',
    'DST_WARNING',
    'BILLING_DIRECT_DEBIT_SETUP',
    'BILLING_DIRECT_DEBIT_REMINDER'
  )),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  timing_minutes INTEGER,
  subject_prefix TEXT NOT NULL DEFAULT '',
  body_note TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  updated_by_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT
);

INSERT INTO notification_settings
SELECT * FROM notification_settings_phase76;

INSERT INTO notification_settings
  (event_type, enabled, timing_minutes, subject_prefix, body_note, updated_at)
VALUES
  ('BILLING_DIRECT_DEBIT_SETUP', 1, NULL, '', '', CURRENT_TIMESTAMP),
  ('BILLING_DIRECT_DEBIT_REMINDER', 1, NULL, '', '', CURRENT_TIMESTAMP)
ON CONFLICT(event_type) DO NOTHING;

DROP TABLE notification_settings_phase76;

PRAGMA foreign_keys = ON;
