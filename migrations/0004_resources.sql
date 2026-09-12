-- Phase 3.1 private learning resources. Apply forward-only.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE RESTRICT,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE RESTRICT,
  uploaded_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  original_filename TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 26214400),
  sha256 TEXT,
  page_count INTEGER,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('worksheet', 'notes', 'reading', 'homework', 'reference', 'other')),
  status TEXT NOT NULL CHECK (status IN ('uploading', 'available', 'failed', 'deleted')),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  retention_until TEXT NOT NULL,
  deleted_at TEXT,
  CHECK (student_id IS NOT NULL OR lesson_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_resources_student_created ON resources(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_lesson_created ON resources(lesson_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_status_created ON resources(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_uploader ON resources(uploaded_by_user_id, created_at DESC);
