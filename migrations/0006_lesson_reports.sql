-- Phase 4 lesson reports. Apply forward-only.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS lesson_reports (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  summary TEXT NOT NULL,
  homework TEXT NOT NULL DEFAULT '',
  additional_notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sent_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_reports_lesson ON lesson_reports(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_reports_student ON lesson_reports(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_reports_status ON lesson_reports(status, updated_at DESC);
