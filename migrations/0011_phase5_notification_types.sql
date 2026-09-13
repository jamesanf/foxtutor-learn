-- Extend the Phase 4 notification vocabulary without creating a second outbox.
PRAGMA foreign_keys = OFF;

ALTER TABLE notifications RENAME TO notifications_phase4;

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
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'SENDING', 'SENT', 'UNKNOWN', 'FAILED')),
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
SELECT * FROM notifications_phase4;

DROP TABLE notifications_phase4;

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

PRAGMA foreign_keys = ON;
