-- Phase 3.11 stores the private feed token encrypted so the current URL can be rendered after navigation.
PRAGMA foreign_keys = ON;

ALTER TABLE calendar_feeds ADD COLUMN token_ciphertext TEXT;
