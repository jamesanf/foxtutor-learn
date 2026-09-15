-- Phase 7.17: invalidate historical cancellation credits that have no provider
-- invoice/payment evidence while retaining an immutable ledger trail.
PRAGMA foreign_keys = ON;

DROP TRIGGER IF EXISTS credit_ledger_refresh_status;
CREATE TRIGGER credit_ledger_refresh_status
AFTER INSERT ON credit_ledger_transactions
BEGIN
  UPDATE customer_credits
  SET status = CASE
    WHEN EXISTS (
      SELECT 1 FROM credit_ledger_transactions t
      WHERE t.credit_id = NEW.credit_id
        AND t.transaction_type = 'REFUND'
        AND t.provider_reference = 'INTERNAL_REPAIR_VOID'
    ) THEN 'FAILED'
    WHEN (
      SELECT c.original_amount_minor - COALESCE(SUM(CASE
        WHEN t.transaction_type IN ('CONSUMPTION', 'REFUND') THEN t.amount_minor
        WHEN t.transaction_type = 'REVERSAL' THEN -t.amount_minor
        ELSE 0 END), 0)
      FROM customer_credits c
      LEFT JOIN credit_ledger_transactions t ON t.credit_id = c.id
      WHERE c.id = NEW.credit_id
      GROUP BY c.id
    ) = 0 THEN 'CONSUMED'
    WHEN (
      SELECT COALESCE(SUM(CASE
        WHEN t.transaction_type IN ('CONSUMPTION', 'REFUND') THEN t.amount_minor
        WHEN t.transaction_type = 'REVERSAL' THEN -t.amount_minor
        ELSE 0 END), 0)
      FROM credit_ledger_transactions t
      WHERE t.credit_id = NEW.credit_id
    ) > 0 THEN 'PARTIALLY_CONSUMED'
    ELSE 'AVAILABLE'
  END,
  updated_at = NEW.created_at
  WHERE id = NEW.credit_id;
END;

-- Existing consumption is reversed before the repair refund so the account
-- balance returns to zero without deleting or rewriting prior transactions.
INSERT INTO credit_ledger_transactions
  (id, account_id, credit_id, transaction_type, amount_minor, source_event_id,
   source_lesson_id, source_cancellation_id, idempotency_key, created_at)
SELECT
  'credit-repair-reversal:' || c.id,
  c.account_id,
  c.id,
  'REVERSAL',
  SUM(t.amount_minor),
  'credit-repair:' || c.id,
  c.source_lesson_id,
  c.source_cancellation_id,
  'credit-repair-reversal:' || c.id,
  '2026-09-15T00:00:00.000Z'
FROM customer_credits c
JOIN credit_ledger_transactions t ON t.credit_id = c.id AND t.transaction_type = 'CONSUMPTION'
WHERE NOT EXISTS (
  SELECT 1
  FROM billing_events e
  JOIN billing_invoices i ON i.billing_event_id = e.id
  WHERE e.lesson_id = c.source_lesson_id
    AND (
      EXISTS (
        SELECT 1 FROM billing_payments p
        WHERE p.invoice_id = i.id
          AND p.status IN ('SCHEDULED', 'SUBMITTED', 'PENDING', 'CONFIRMED')
      )
      OR EXISTS (
        SELECT 1 FROM billing_invoice_operations op
        WHERE op.invoice_id = i.id
          AND op.operation_type = 'INITIATE_DIRECT_DEBIT'
          AND op.status IN ('PROCESSING', 'SUCCEEDED', 'UNKNOWN')
      )
    )
)
GROUP BY c.id
ON CONFLICT(idempotency_key) DO NOTHING;

INSERT INTO credit_ledger_transactions
  (id, account_id, credit_id, transaction_type, amount_minor, source_event_id,
   source_lesson_id, source_cancellation_id, provider_reference, idempotency_key, created_at)
SELECT
  'credit-repair-void:' || c.id,
  c.account_id,
  c.id,
  'REFUND',
  c.original_amount_minor,
  'credit-repair:' || c.id,
  c.source_lesson_id,
  c.source_cancellation_id,
  'INTERNAL_REPAIR_VOID',
  'credit-repair-void:' || c.id,
  '2026-09-15T00:00:01.000Z'
FROM customer_credits c
WHERE NOT EXISTS (
  SELECT 1 FROM credit_ledger_transactions t
  WHERE t.credit_id = c.id AND t.provider_reference = 'INTERNAL_REPAIR_VOID'
)
AND NOT EXISTS (
  SELECT 1
  FROM billing_events e
  JOIN billing_invoices i ON i.billing_event_id = e.id
  WHERE e.lesson_id = c.source_lesson_id
    AND (
      EXISTS (
        SELECT 1 FROM billing_payments p
        WHERE p.invoice_id = i.id
          AND p.status IN ('SCHEDULED', 'SUBMITTED', 'PENDING', 'CONFIRMED')
      )
      OR EXISTS (
        SELECT 1 FROM billing_invoice_operations op
        WHERE op.invoice_id = i.id
          AND op.operation_type = 'INITIATE_DIRECT_DEBIT'
          AND op.status IN ('PROCESSING', 'SUCCEEDED', 'UNKNOWN')
      )
    )
);
