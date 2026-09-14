-- Production Direct Debit collection requires an explicit administrator authorization.
ALTER TABLE billing_invoice_operations ADD COLUMN human_authorized_at TEXT;
ALTER TABLE billing_invoice_operations ADD COLUMN human_authorized_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_billing_operations_authorization
  ON billing_invoice_operations(operation_type, human_authorized_at, status);
