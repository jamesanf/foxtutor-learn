-- Add the optional parent/carer name to the existing student profile.
PRAGMA foreign_keys = ON;

ALTER TABLE students ADD COLUMN parent_name TEXT NOT NULL DEFAULT '';
