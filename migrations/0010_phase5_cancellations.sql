-- Phase 5 cancellation, rescheduling and immutable lesson history.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS lesson_cancellation_requests (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  requested_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  decided_at TEXT,
  decided_by_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
  decision_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_cancellation_requests_status_created
  ON lesson_cancellation_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_lesson
  ON lesson_cancellation_requests(lesson_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_student
  ON lesson_cancellation_requests(student_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_cancellation_request
  ON lesson_cancellation_requests(lesson_id)
  WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS lesson_history (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  request_id TEXT REFERENCES lesson_cancellation_requests(id) ON DELETE RESTRICT,
  initiated_by_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('ADMIN', 'STUDENT', 'SYSTEM')),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'STUDENT_CANCELLED',
    'CANCELLATION_REQUESTED',
    'CANCELLATION_APPROVED',
    'CANCELLATION_REJECTED',
    'ADMIN_CANCELLED',
    'RESCHEDULED'
  )),
  requested_at TEXT,
  decided_at TEXT,
  decision TEXT,
  reason TEXT,
  billing_consequence TEXT CHECK (billing_consequence IS NULL OR billing_consequence IN (
    'NO_CHARGE',
    'CANCELLATION_PENDING_DECISION',
    'EXCEPTION_WAIVED',
    'ADMIN_CANCELLED',
    'RESCHEDULED'
  )),
  previous_start_at TEXT,
  previous_end_at TEXT,
  previous_timezone TEXT,
  new_start_at TEXT,
  new_end_at TEXT,
  new_timezone TEXT,
  resulting_lesson_status TEXT NOT NULL CHECK (resulting_lesson_status IN ('scheduled', 'completed', 'cancelled')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lesson_history_lesson_created
  ON lesson_history(lesson_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_history_student_created
  ON lesson_history(student_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_history_request_event
  ON lesson_history(request_id, event_type)
  WHERE request_id IS NOT NULL;
