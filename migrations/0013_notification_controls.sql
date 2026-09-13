-- Admin notification controls and suppressed delivery state. Apply forward-only.
PRAGMA foreign_keys = OFF;

ALTER TABLE notifications RENAME TO notifications_phase5;

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
    'DST_WARNING'
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

INSERT INTO notifications SELECT * FROM notifications_phase5;
DROP TABLE notifications_phase5;

CREATE INDEX idx_notifications_status_attempt
  ON notifications(status, next_attempt_at, scheduled_at);
CREATE INDEX idx_notifications_event
  ON notifications(event_type, event_id);
CREATE INDEX idx_notifications_recipient
  ON notifications(recipient_user_id, created_at DESC);
CREATE INDEX idx_notifications_lesson
  ON notifications(lesson_id, created_at DESC);
CREATE INDEX idx_notifications_resource
  ON notifications(resource_id, created_at DESC);

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS notification_settings (
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
    'DST_WARNING'
  )),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  timing_minutes INTEGER,
  subject_prefix TEXT NOT NULL DEFAULT '',
  body_note TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  updated_by_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT
);

INSERT INTO notification_settings
  (event_type, enabled, timing_minutes, subject_prefix, body_note, updated_at)
VALUES
  ('STUDENT_INVITED', 1, NULL, '', '', CURRENT_TIMESTAMP),
  ('LESSON_CREATED', 1, NULL, '', '', CURRENT_TIMESTAMP),
  ('LESSON_CHANGED', 1, NULL, '', '', CURRENT_TIMESTAMP),
  ('LESSON_REMINDER', 1, 15, '', '', CURRENT_TIMESTAMP),
  ('RESOURCE_ADDED', 1, NULL, '', '', CURRENT_TIMESTAMP),
  ('CANCELLATION_PROCESSED', 1, NULL, '', '', CURRENT_TIMESTAMP),
  ('CANCELLATION_REQUESTED', 1, NULL, '', '', CURRENT_TIMESTAMP),
  ('CANCELLATION_APPROVED', 1, NULL, '', '', CURRENT_TIMESTAMP),
  ('CANCELLATION_REJECTED', 1, NULL, '', '', CURRENT_TIMESTAMP),
  ('LESSON_RESCHEDULED', 1, NULL, '', '', CURRENT_TIMESTAMP),
  ('LESSON_REPORT', 1, NULL, '', '', CURRENT_TIMESTAMP),
  ('DST_WARNING', 1, NULL, '', '', CURRENT_TIMESTAMP)
ON CONFLICT(event_type) DO NOTHING;
