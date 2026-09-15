-- A provider validation failure must not remain actionable after the lesson is
-- cancelled. No provider invoice exists in this state, so close the local
-- billing lifecycle and resolve the corresponding alert as a no-op repair.
PRAGMA foreign_keys = ON;

UPDATE billing_invoices
SET status = 'CANCELLED',
    provider_status = 'CANCELLED_BEFORE_PROVIDER',
    updated_at = datetime('now')
WHERE status = 'FAILED'
  AND freeagent_url IS NULL
  AND EXISTS (
    SELECT 1
    FROM billing_events e
    JOIN lessons l ON l.id = e.lesson_id
    WHERE e.id = billing_invoices.billing_event_id
      AND l.status = 'cancelled'
  );

UPDATE billing_events
SET status = 'CANCELLED',
    provider_status = 'CANCELLED_BEFORE_PROVIDER',
    updated_at = datetime('now')
WHERE status = 'FAILED'
  AND EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.id = billing_events.lesson_id
      AND l.status = 'cancelled'
  );

UPDATE billing_invoice_operations
SET status = 'BLOCKED',
    provider_status = 'CANCELLED_BEFORE_PROVIDER',
    safe_error_code = 'CANCELLED_BEFORE_PROVIDER',
    safe_error_message = 'The lesson was cancelled before a provider invoice was created.',
    completed_at = datetime('now'),
    updated_at = datetime('now')
WHERE operation_type = 'CREATE_INVOICE'
  AND status IN ('PENDING', 'PROCESSING', 'RETRYABLE', 'FAILED', 'UNKNOWN')
  AND EXISTS (
    SELECT 1
    FROM billing_invoices i
    JOIN billing_events e ON e.id = i.billing_event_id
    JOIN lessons l ON l.id = e.lesson_id
    WHERE i.id = billing_invoice_operations.invoice_id
      AND i.status = 'CANCELLED'
      AND i.freeagent_url IS NULL
      AND l.status = 'cancelled'
  );

UPDATE billing_alerts
SET status = 'RESOLVED',
    resolved_at = datetime('now'),
    resolution_note = 'Lesson cancelled before a provider invoice was created; failed creation is no longer actionable.',
    updated_at = datetime('now')
WHERE status IN ('OPEN', 'ACKNOWLEDGED')
  AND invoice_id IN (
    SELECT i.id
    FROM billing_invoices i
    JOIN billing_events e ON e.id = i.billing_event_id
    JOIN lessons l ON l.id = e.lesson_id
    WHERE i.status = 'CANCELLED'
      AND i.freeagent_url IS NULL
      AND l.status = 'cancelled'
  );
