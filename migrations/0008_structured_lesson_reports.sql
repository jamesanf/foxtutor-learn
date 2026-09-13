-- Phase 4.2 structured lesson reports and student levels. Apply forward-only.
PRAGMA foreign_keys = ON;

ALTER TABLE students ADD COLUMN level TEXT;

ALTER TABLE lesson_reports ADD COLUMN pupil_name TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_reports ADD COLUMN level TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_reports ADD COLUMN lesson_date TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_reports ADD COLUMN lesson_start_at TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_reports ADD COLUMN lesson_end_at TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_reports ADD COLUMN lesson_timezone TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_reports ADD COLUMN this_lessons_focus TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_reports ADD COLUMN next_lessons_focus TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_reports ADD COLUMN writing_practice TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_reports ADD COLUMN home_learning_task TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_reports ADD COLUMN notes TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_reports ADD COLUMN even_better_if TEXT NOT NULL DEFAULT '';

UPDATE lesson_reports
SET this_lessons_focus = CASE WHEN this_lessons_focus = '' THEN summary ELSE this_lessons_focus END,
    home_learning_task = CASE WHEN home_learning_task = '' THEN homework ELSE home_learning_task END,
    notes = CASE WHEN notes = '' THEN additional_notes ELSE notes END
WHERE this_lessons_focus = '' OR home_learning_task = '' OR notes = '';

UPDATE lesson_reports
SET pupil_name = (SELECT s.name FROM students s WHERE s.id = lesson_reports.student_id),
    level = COALESCE((SELECT s.level FROM students s WHERE s.id = lesson_reports.student_id), ''),
    lesson_date = substr((SELECT l.start_at FROM lessons l WHERE l.id = lesson_reports.lesson_id), 1, 10),
    lesson_start_at = (SELECT l.start_at FROM lessons l WHERE l.id = lesson_reports.lesson_id),
    lesson_end_at = (SELECT l.end_at FROM lessons l WHERE l.id = lesson_reports.lesson_id),
    lesson_timezone = (SELECT l.timezone FROM lessons l WHERE l.id = lesson_reports.lesson_id)
WHERE pupil_name = '' OR lesson_date = '' OR lesson_start_at = '' OR lesson_end_at = '' OR lesson_timezone = '';

CREATE INDEX IF NOT EXISTS idx_lesson_reports_student_status ON lesson_reports(student_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_reports_lesson_status ON lesson_reports(lesson_id, status);
