-- Phase 6 billing boundary. FoxTutor owns lesson entitlement and customer credit;
-- FreeAgent owns accounting documents and provider payment state.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS billing_events (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL CHECK (event_type IN ('WEEKLY_LESSON', 'ADMIN_CANCELLATION')),
  lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  payer_student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  source_event_id TEXT NOT NULL UNIQUE,
  lesson_date TEXT,
  billing_date TEXT,
  due_date TEXT,
  collection_date TEXT,
  cancellation_date TEXT,
  credit_note_date TEXT,
  gross_amount_minor INTEGER NOT NULL CHECK (gross_amount_minor > 0),
  credit_applied_minor INTEGER NOT NULL DEFAULT 0 CHECK (credit_applied_minor >= 0 AND credit_applied_minor <= gross_amount_minor),
  net_amount_minor INTEGER NOT NULL CHECK (net_amount_minor >= 0 AND net_amount_minor <= gross_amount_minor),
  currency TEXT NOT NULL CHECK (currency = 'GBP'),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'INVOICE_PENDING', 'INVOICE_CREATED', 'SETTLED', 'CANCELLED', 'UNKNOWN', 'FAILED')),
  external_reference TEXT,
  external_url TEXT,
  provider_status TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_events_due
  ON billing_events(status, collection_date, created_at);
CREATE INDEX IF NOT EXISTS idx_billing_events_student
  ON billing_events(student_id, lesson_date, created_at);

CREATE TABLE IF NOT EXISTS customer_credit_accounts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL UNIQUE REFERENCES students(id) ON DELETE RESTRICT,
  payer_student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  currency TEXT NOT NULL CHECK (currency = 'GBP'),
  available_minor INTEGER NOT NULL DEFAULT 0 CHECK (available_minor >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_credits (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES customer_credit_accounts(id) ON DELETE RESTRICT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  payer_student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  source_event_id TEXT NOT NULL UNIQUE,
  source_lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  source_cancellation_id TEXT REFERENCES lesson_history(id) ON DELETE SET NULL,
  original_amount_minor INTEGER NOT NULL CHECK (original_amount_minor > 0),
  status TEXT NOT NULL CHECK (status IN ('AVAILABLE', 'PARTIALLY_CONSUMED', 'CONSUMED', 'REFUND_PENDING', 'REFUNDED', 'PENDING_VALUE', 'FAILED')),
  freeagent_credit_note_reference TEXT,
  freeagent_credit_note_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_customer_credits_account
  ON customer_credits(account_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_customer_credits_provider
  ON customer_credits(freeagent_credit_note_reference);

CREATE TABLE IF NOT EXISTS credit_ledger_transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES customer_credit_accounts(id) ON DELETE RESTRICT,
  credit_id TEXT NOT NULL REFERENCES customer_credits(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('GRANT', 'CONSUMPTION', 'REFUND', 'REVERSAL')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  source_event_id TEXT NOT NULL,
  source_lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  source_cancellation_id TEXT REFERENCES lesson_history(id) ON DELETE SET NULL,
  invoice_id TEXT,
  refund_id TEXT,
  provider_reference TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_account_created
  ON credit_ledger_transactions(account_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_credit_created
  ON credit_ledger_transactions(credit_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_invoice
  ON credit_ledger_transactions(invoice_id);

CREATE TRIGGER IF NOT EXISTS credit_ledger_reject_overconsumption
BEFORE INSERT ON credit_ledger_transactions
WHEN NEW.transaction_type IN ('CONSUMPTION', 'REFUND')
BEGIN
  SELECT RAISE(ABORT, 'customer credit cannot become negative')
  WHERE (SELECT available_minor FROM customer_credit_accounts WHERE id = NEW.account_id) < NEW.amount_minor;
END;

CREATE TRIGGER IF NOT EXISTS credit_ledger_apply_balance
AFTER INSERT ON credit_ledger_transactions
BEGIN
  UPDATE customer_credit_accounts
  SET available_minor = CASE
    WHEN NEW.transaction_type = 'GRANT' OR NEW.transaction_type = 'REVERSAL'
      THEN available_minor + NEW.amount_minor
    ELSE available_minor - NEW.amount_minor
  END,
  updated_at = NEW.created_at
  WHERE id = NEW.account_id;
END;

CREATE TRIGGER IF NOT EXISTS credit_ledger_refresh_status
AFTER INSERT ON credit_ledger_transactions
BEGIN
  UPDATE customer_credits
  SET status = CASE
    WHEN (
      SELECT c.original_amount_minor - COALESCE(SUM(CASE WHEN t.transaction_type IN ('CONSUMPTION', 'REFUND') THEN t.amount_minor ELSE 0 END), 0)
      FROM customer_credits c
      LEFT JOIN credit_ledger_transactions t ON t.credit_id = c.id
      WHERE c.id = NEW.credit_id
      GROUP BY c.id
    ) = 0 AND (
      SELECT COALESCE(SUM(CASE WHEN t.transaction_type = 'REFUND' THEN t.amount_minor ELSE 0 END), 0)
      FROM credit_ledger_transactions t
      WHERE t.credit_id = NEW.credit_id
    ) > 0 THEN 'REFUNDED'
    WHEN (
      SELECT c.original_amount_minor - COALESCE(SUM(CASE WHEN t.transaction_type IN ('CONSUMPTION', 'REFUND') THEN t.amount_minor ELSE 0 END), 0)
      FROM customer_credits c
      LEFT JOIN credit_ledger_transactions t ON t.credit_id = c.id
      WHERE c.id = NEW.credit_id
      GROUP BY c.id
    ) = 0 THEN 'CONSUMED'
    WHEN (
      SELECT COALESCE(SUM(CASE WHEN t.transaction_type IN ('CONSUMPTION', 'REFUND') THEN t.amount_minor ELSE 0 END), 0)
      FROM credit_ledger_transactions t
      WHERE t.credit_id = NEW.credit_id
    ) > 0 THEN 'PARTIALLY_CONSUMED'
    ELSE 'AVAILABLE'
  END,
  updated_at = NEW.created_at
  WHERE id = NEW.credit_id;
END;

CREATE TABLE IF NOT EXISTS billing_invoices (
  id TEXT PRIMARY KEY,
  billing_event_id TEXT NOT NULL UNIQUE REFERENCES billing_events(id) ON DELETE RESTRICT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  gross_amount_minor INTEGER NOT NULL CHECK (gross_amount_minor > 0),
  credit_applied_minor INTEGER NOT NULL DEFAULT 0 CHECK (credit_applied_minor >= 0 AND credit_applied_minor <= gross_amount_minor),
  net_amount_minor INTEGER NOT NULL CHECK (net_amount_minor >= 0 AND net_amount_minor <= gross_amount_minor),
  currency TEXT NOT NULL CHECK (currency = 'GBP'),
  lesson_date TEXT,
  billing_date TEXT NOT NULL,
  due_date TEXT,
  collection_date TEXT,
  status TEXT NOT NULL CHECK (status IN ('PENDING_PROVIDER', 'DRAFT', 'SENT', 'PAYMENT_PENDING', 'PAID', 'FAILED', 'UNKNOWN', 'CANCELLED')),
  freeagent_reference TEXT UNIQUE,
  freeagent_url TEXT,
  provider_status TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_collection
  ON billing_invoices(status, collection_date);

CREATE TABLE IF NOT EXISTS billing_invoice_credit_applications (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES billing_invoices(id) ON DELETE RESTRICT,
  credit_id TEXT NOT NULL REFERENCES customer_credits(id) ON DELETE RESTRICT,
  ledger_transaction_id TEXT NOT NULL UNIQUE REFERENCES credit_ledger_transactions(id) ON DELETE RESTRICT,
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  freeagent_credit_note_reference TEXT,
  status TEXT NOT NULL CHECK (status IN ('RECORDED', 'PROVIDER_PENDING', 'PROVIDER_APPLIED', 'PROVIDER_FAILED', 'RECONCILIATION_REQUIRED')),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_credit_application_per_invoice_credit
  ON billing_invoice_credit_applications(invoice_id, credit_id);

CREATE TABLE IF NOT EXISTS billing_refunds (
  id TEXT PRIMARY KEY,
  credit_id TEXT NOT NULL REFERENCES customer_credits(id) ON DELETE RESTRICT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL CHECK (currency = 'GBP'),
  status TEXT NOT NULL CHECK (status IN ('REQUESTED', 'AUTHORISED', 'PROCESSING', 'PAID', 'FAILED', 'UNKNOWN')),
  provider_reference TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  authorised_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  requested_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS billing_provider_operations (
  id TEXT PRIMARY KEY,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('CREATE_CREDIT_NOTE', 'APPLY_CREDIT_NOTE', 'INITIATE_DIRECT_DEBIT', 'RECONCILE')),
  billing_event_id TEXT REFERENCES billing_events(id) ON DELETE SET NULL,
  invoice_id TEXT REFERENCES billing_invoices(id) ON DELETE SET NULL,
  credit_id TEXT REFERENCES customer_credits(id) ON DELETE SET NULL,
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
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_billing_provider_operations_due
  ON billing_provider_operations(status, next_attempt_at, created_at);

CREATE VIEW IF NOT EXISTS customer_credit_balances AS
SELECT
  c.id AS credit_id,
  c.account_id,
  c.student_id,
  c.payer_student_id,
  c.source_event_id,
  c.original_amount_minor,
  COALESCE(SUM(CASE WHEN t.transaction_type IN ('CONSUMPTION', 'REFUND') THEN t.amount_minor ELSE 0 END), 0) AS amount_consumed_minor,
  COALESCE(SUM(CASE WHEN t.transaction_type = 'REFUND' THEN t.amount_minor ELSE 0 END), 0) AS amount_refunded_minor,
  c.original_amount_minor - COALESCE(SUM(CASE WHEN t.transaction_type IN ('CONSUMPTION', 'REFUND') THEN t.amount_minor ELSE 0 END), 0) AS remaining_amount_minor,
  c.status,
  c.freeagent_credit_note_reference,
  c.freeagent_credit_note_url,
  c.created_at,
  c.updated_at
FROM customer_credits c
LEFT JOIN credit_ledger_transactions t ON t.credit_id = c.id
GROUP BY c.id;
