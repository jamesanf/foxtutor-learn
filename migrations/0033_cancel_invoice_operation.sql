PRAGMA foreign_keys = OFF;

ALTER TABLE billing_invoice_operations RENAME TO billing_invoice_operations_legacy;

CREATE TABLE billing_invoice_operations (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES billing_invoices(id) ON DELETE RESTRICT,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('CREATE_INVOICE', 'INITIATE_DIRECT_DEBIT', 'CANCEL_INVOICE', 'RECONCILE')),
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'RETRYABLE', 'FAILED', 'UNKNOWN', 'BLOCKED')),
  provider_reference TEXT,
  provider_url TEXT,
  provider_status TEXT,
  safe_error_code TEXT,
  safe_error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  human_authorized_at TEXT,
  human_authorized_by_user_id TEXT,
  UNIQUE(invoice_id, operation_type)
);

INSERT INTO billing_invoice_operations (
  id, invoice_id, operation_type, idempotency_key, status,
  provider_reference, provider_url, provider_status, safe_error_code,
  safe_error_message, attempt_count, next_attempt_at, created_at, updated_at,
  completed_at, human_authorized_at, human_authorized_by_user_id
)
SELECT
  id, invoice_id, operation_type, idempotency_key, status,
  provider_reference, provider_url, provider_status, safe_error_code,
  safe_error_message, attempt_count, next_attempt_at, created_at, updated_at,
  completed_at, human_authorized_at, human_authorized_by_user_id
FROM billing_invoice_operations_legacy;

DROP TABLE billing_invoice_operations_legacy;

CREATE INDEX IF NOT EXISTS idx_billing_invoice_operations_due
  ON billing_invoice_operations(status, next_attempt_at, created_at);

CREATE INDEX IF NOT EXISTS idx_billing_invoice_operations_invoice
  ON billing_invoice_operations(invoice_id, operation_type, status);

PRAGMA foreign_keys = ON;
