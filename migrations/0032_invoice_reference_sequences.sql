CREATE TABLE IF NOT EXISTS billing_invoice_references (
  invoice_id TEXT PRIMARY KEY,
  business_date TEXT NOT NULL,
  sequence INTEGER NOT NULL CHECK (sequence BETWEEN 1 AND 99),
  UNIQUE (business_date, sequence),
  FOREIGN KEY (invoice_id) REFERENCES billing_invoices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_billing_invoice_references_business_date
  ON billing_invoice_references (business_date, sequence);
