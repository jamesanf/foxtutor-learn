-- Administrative cancellation consequences are handled by the billing
-- workflow; the legacy accounting outbox must not surface them as failures.
UPDATE accounting_outbox
SET action_type = 'NO_ACTION',
    status = 'NOT_REQUIRED',
    provider_status = 'NOT_REQUIRED',
    safe_error_code = NULL,
    safe_error_message = NULL,
    next_attempt_at = NULL,
    completed_at = COALESCE(completed_at, updated_at),
    updated_at = CURRENT_TIMESTAMP
WHERE event_type = 'CANCELLATION_ACCOUNTING'
  AND billing_consequence = 'ADMIN_CANCELLED'
  AND status = 'FAILED'
  AND safe_error_code = 'BUSINESS_MAPPING_REQUIRED';
