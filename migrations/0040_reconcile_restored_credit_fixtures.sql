-- Repair controlled zero-value Production fixtures whose credit was already
-- reversed locally but whose old provider/application status was left stale.
PRAGMA foreign_keys = ON;

UPDATE billing_invoices
SET status = 'CANCELLED',
    provider_status = 'CREDIT_RESTORED',
    updated_at = datetime('now')
WHERE provider_environment = 'production'
  AND status = 'PAID'
  AND provider_status = 'CANCELLATION_PENDING'
  AND net_amount_minor = 0
  AND EXISTS (
    SELECT 1
    FROM billing_events e
    JOIN lessons l ON l.id = e.lesson_id
    WHERE e.id = billing_invoices.billing_event_id
      AND l.status = 'cancelled'
  )
  AND EXISTS (
    SELECT 1
    FROM billing_invoice_credit_applications a
    WHERE a.invoice_id = billing_invoices.id
      AND a.status = 'PROVIDER_FAILED'
  )
  AND EXISTS (
    SELECT 1
    FROM credit_ledger_transactions t
    WHERE t.invoice_id = billing_invoices.id
      AND t.transaction_type = 'REVERSAL'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM billing_payments p
    WHERE p.invoice_id = billing_invoices.id
      AND p.status IN ('SCHEDULED', 'SUBMITTED', 'PENDING', 'CONFIRMED', 'FAILED', 'UNKNOWN')
  );

UPDATE billing_invoice_credit_applications
SET status = 'REVERSED'
WHERE status = 'PROVIDER_FAILED'
  AND EXISTS (
    SELECT 1
    FROM billing_invoices i
    WHERE i.id = billing_invoice_credit_applications.invoice_id
      AND i.status = 'CANCELLED'
      AND i.provider_status = 'CREDIT_RESTORED'
  );

UPDATE billing_events
SET provider_status = 'CREDIT_RESTORED',
    updated_at = datetime('now')
WHERE status = 'CANCELLED'
  AND provider_status = 'CREDIT_COVERED'
  AND EXISTS (
    SELECT 1
    FROM billing_invoices i
    WHERE i.billing_event_id = billing_events.id
      AND i.status = 'CANCELLED'
      AND i.provider_status = 'CREDIT_RESTORED'
  );

UPDATE billing_alerts
SET status = 'RESOLVED',
    resolved_at = datetime('now'),
    resolution_note = 'Controlled zero-value fixture had already restored its credit locally; stale provider/application state was reconciled.',
    updated_at = datetime('now')
WHERE status IN ('OPEN', 'ACKNOWLEDGED')
  AND invoice_id IN (
    SELECT id
    FROM billing_invoices
    WHERE status = 'CANCELLED'
      AND provider_status = 'CREDIT_RESTORED'
  );

INSERT INTO billing_alert_events (id, alert_id, event_type, actor_user_id, details, created_at)
SELECT lower(hex(randomblob(16))), a.id, 'RESOLVED', NULL,
       'Controlled zero-value fixture had already restored its credit locally; stale provider/application state was reconciled.',
       datetime('now')
FROM billing_alerts a
WHERE a.status = 'RESOLVED'
  AND a.resolution_note = 'Controlled zero-value fixture had already restored its credit locally; stale provider/application state was reconciled.'
  AND NOT EXISTS (
    SELECT 1
    FROM billing_alert_events ae
    WHERE ae.alert_id = a.id
      AND ae.event_type = 'RESOLVED'
      AND ae.details = a.resolution_note
  );
