-- Admin-managed invoice settings. GBP is intentionally immutable at the schema boundary.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounting_billing_settings (
  id TEXT PRIMARY KEY CHECK (id = 'FREEAGENT'),
  amount TEXT NOT NULL,
  item_type TEXT NOT NULL,
  category_url TEXT NOT NULL,
  payment_terms_days INTEGER NOT NULL CHECK (payment_terms_days BETWEEN 0 AND 365),
  currency TEXT NOT NULL CHECK (currency = 'GBP'),
  sales_tax_rate TEXT NOT NULL,
  updated_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
