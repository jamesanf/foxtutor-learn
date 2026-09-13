-- Student profile fields and academic-year tracking. Apply forward-only.
PRAGMA foreign_keys = ON;

ALTER TABLE students ADD COLUMN parent_email TEXT NOT NULL DEFAULT '';
ALTER TABLE students ADD COLUMN billing_address TEXT NOT NULL DEFAULT '';
ALTER TABLE students ADD COLUMN additional_support_needs TEXT NOT NULL DEFAULT '';
ALTER TABLE students ADD COLUMN academic_year_system TEXT NOT NULL DEFAULT 'PRIVATE'
  CHECK (academic_year_system IN ('ENGLISH', 'SCOTTISH', 'MATURE', 'PRIVATE', 'INTERNATIONAL'));
ALTER TABLE students ADD COLUMN academic_year TEXT NOT NULL DEFAULT 'Private';
ALTER TABLE students ADD COLUMN academic_year_anchor_date TEXT;
ALTER TABLE students ADD COLUMN class_texts TEXT NOT NULL DEFAULT '';
