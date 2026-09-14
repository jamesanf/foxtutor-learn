-- Preserve the distinction between a Direct Debit collection being submitted
-- and the provider confirming settlement.
PRAGMA foreign_keys = OFF;

ALTER TABLE billing_payments RENAME TO billing_payments_phase77;

CREATE TABLE billing_payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES billing_invoices(id) ON DELETE RESTRICT,
  method TEXT NOT NULL CHECK (method = 'FREEAGENT_GOCARDLESS'),
  status TEXT NOT NULL CHECK (status IN (
    'NOT_STARTED', 'SCHEDULED', 'SUBMITTED', 'PENDING', 'CONFIRMED', 'FAILED', 'UNKNOWN'
  )),
  provider_reference TEXT,
  provider_status TEXT,
  collection_date TEXT NOT NULL,
  first_payment INTEGER NOT NULL DEFAULT 0 CHECK (first_payment IN (0, 1)),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(invoice_id)
);

INSERT INTO billing_payments
SELECT * FROM billing_payments_phase77;

DROP TABLE billing_payments_phase77;

CREATE INDEX IF NOT EXISTS idx_billing_payments_status
  ON billing_payments(status, collection_date, updated_at);

PRAGMA foreign_keys = ON;
