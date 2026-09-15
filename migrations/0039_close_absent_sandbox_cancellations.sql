-- These are controlled Sandbox fixtures whose provider documents were already
-- absent. No collection operation or payment exists for any of them.
PRAGMA foreign_keys = ON;

UPDATE billing_invoices
SET status = 'CANCELLED',
    provider_status = 'NOT_FOUND_CANCELED',
    updated_at = datetime('now')
WHERE provider_environment = 'sandbox'
  AND status = 'PAYMENT_PENDING'
  AND provider_status = 'CANCELLATION_PENDING'
  AND EXISTS (
    SELECT 1
    FROM billing_events e
    JOIN lessons l ON l.id = e.lesson_id
    WHERE e.id = billing_invoices.billing_event_id
      AND l.status = 'cancelled'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM billing_invoice_operations op
    WHERE op.invoice_id = billing_invoices.id
      AND op.operation_type = 'INITIATE_DIRECT_DEBIT'
      AND op.status IN ('PROCESSING', 'SUCCEEDED', 'UNKNOWN')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM billing_payments p
    WHERE p.invoice_id = billing_invoices.id
      AND p.status IN ('SCHEDULED', 'SUBMITTED', 'PENDING', 'CONFIRMED', 'FAILED', 'UNKNOWN')
  );

UPDATE billing_invoice_operations
SET status = 'SUCCEEDED',
    provider_status = 'NOT_FOUND',
    safe_error_code = NULL,
    safe_error_message = NULL,
    completed_at = datetime('now'),
    updated_at = datetime('now')
WHERE operation_type = 'CANCEL_INVOICE'
  AND status = 'FAILED'
  AND provider_status = '404'
  AND EXISTS (
    SELECT 1
    FROM billing_invoices i
    JOIN billing_events e ON e.id = i.billing_event_id
    JOIN lessons l ON l.id = e.lesson_id
    WHERE i.id = billing_invoice_operations.invoice_id
      AND i.provider_environment = 'sandbox'
      AND i.status = 'CANCELLED'
      AND i.provider_status = 'NOT_FOUND_CANCELED'
      AND l.status = 'cancelled'
  );

UPDATE billing_invoices
SET status = 'CANCELLED',
    provider_status = 'CONTROLLED_SANDBOX_CLOSED',
    updated_at = datetime('now')
WHERE provider_environment = 'sandbox'
  AND status = 'PAYMENT_PENDING'
  AND provider_status = 'Draft'
  AND EXISTS (
    SELECT 1
    FROM billing_events e
    JOIN lessons l ON l.id = e.lesson_id
    WHERE e.id = billing_invoices.billing_event_id
      AND l.status = 'cancelled'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM billing_invoice_operations op
    WHERE op.invoice_id = billing_invoices.id
      AND op.operation_type = 'INITIATE_DIRECT_DEBIT'
      AND op.status IN ('PROCESSING', 'SUCCEEDED', 'UNKNOWN')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM billing_payments p
    WHERE p.invoice_id = billing_invoices.id
      AND p.status IN ('SCHEDULED', 'SUBMITTED', 'PENDING', 'CONFIRMED', 'FAILED', 'UNKNOWN')
  );

UPDATE billing_alerts
SET status = 'RESOLVED',
    resolved_at = datetime('now'),
    resolution_note = 'Controlled Sandbox fixture closed after cancellation; no Production payment or collection was involved.',
    updated_at = datetime('now')
WHERE status IN ('OPEN', 'ACKNOWLEDGED')
  AND invoice_id IN (
    SELECT i.id
    FROM billing_invoices i
    JOIN billing_events e ON e.id = i.billing_event_id
    JOIN lessons l ON l.id = e.lesson_id
    WHERE i.provider_environment = 'sandbox'
      AND l.status = 'cancelled'
      AND i.status = 'CANCELLED'
      AND i.provider_status IN ('NOT_FOUND_CANCELED', 'CONTROLLED_SANDBOX_CLOSED')
  );

INSERT INTO billing_alert_events (id, alert_id, event_type, actor_user_id, details, created_at)
SELECT lower(hex(randomblob(16))), a.id, 'RESOLVED', NULL,
       'Controlled Sandbox fixture closed after cancellation; no Production payment or collection was involved.',
       datetime('now')
FROM billing_alerts a
WHERE a.status = 'RESOLVED'
  AND a.resolution_note = 'Controlled Sandbox fixture closed after cancellation; no Production payment or collection was involved.'
  AND NOT EXISTS (
    SELECT 1
    FROM billing_alert_events ae
    WHERE ae.alert_id = a.id
      AND ae.event_type = 'RESOLVED'
      AND ae.details = a.resolution_note
  );
