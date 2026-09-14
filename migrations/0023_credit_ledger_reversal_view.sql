-- Keep credit balances correct when a provider failure releases a local allocation.
PRAGMA foreign_keys = ON;

DROP TRIGGER IF EXISTS credit_ledger_refresh_status;
CREATE TRIGGER credit_ledger_refresh_status
AFTER INSERT ON credit_ledger_transactions
BEGIN
  UPDATE customer_credits
  SET status = CASE
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

DROP VIEW IF EXISTS customer_credit_balances;
CREATE VIEW customer_credit_balances AS
SELECT
  c.id AS credit_id,
  c.account_id,
  c.student_id,
  c.payer_student_id,
  c.source_event_id,
  c.original_amount_minor,
  COALESCE(SUM(CASE WHEN t.transaction_type = 'CONSUMPTION' THEN t.amount_minor ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN t.transaction_type = 'REVERSAL' THEN t.amount_minor ELSE 0 END), 0)
    AS amount_consumed_minor,
  COALESCE(SUM(CASE WHEN t.transaction_type = 'REFUND' THEN t.amount_minor ELSE 0 END), 0)
    AS amount_refunded_minor,
  c.original_amount_minor
    - COALESCE(SUM(CASE WHEN t.transaction_type IN ('CONSUMPTION', 'REFUND') THEN t.amount_minor ELSE 0 END), 0)
    + COALESCE(SUM(CASE WHEN t.transaction_type = 'REVERSAL' THEN t.amount_minor ELSE 0 END), 0)
    AS remaining_amount_minor,
  c.status,
  c.freeagent_credit_note_reference,
  c.freeagent_credit_note_url,
  c.created_at,
  c.updated_at
FROM customer_credits c
LEFT JOIN credit_ledger_transactions t ON t.credit_id = c.id
GROUP BY c.id;
