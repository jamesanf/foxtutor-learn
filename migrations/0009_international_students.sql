-- Phase 4.2 student timezone communication preference. Apply forward-only.
PRAGMA foreign_keys = ON;

ALTER TABLE students ADD COLUMN international INTEGER NOT NULL DEFAULT 0 CHECK (international IN (0, 1));
