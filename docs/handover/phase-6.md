# Phase 6 - External acceptance runbook

This runbook contains no secrets. It starts only after the owner approves the
commercial contract and supplies credentials through the approved secret
channel.

## Sandbox

1. Configure the sandbox FreeAgent environment, client ID, client secret,
   encryption key, exact registered callback URI, company subdomain and
   approved provider mapping values. The normal lesson payload is fixed at
   55.00 GBP with an explicit invoice-item sales tax rate of `0`.
2. Decide the `ADMIN_CANCELLED` accounting consequence before creating or
   processing an administrative-cancellation invoice event. The system will
   not infer invoice creation or no action.
3. Confirm the configured environment is `sandbox` and the callback exactly
   matches the registered URI.
4. As an admin, open `/learn/admin/accounting` and start the FreeAgent
   connection.
5. Complete OAuth, verify the returned company subdomain and confirm the
   connection status.
6. For the approved test payer, enter the numeric FreeAgent contact ID.
   Confirm the server verifies the contact in the pinned company before saving.
7. After the consequence is approved, create or select the approved
   `ADMIN_CANCELLED` test event. Confirm one
   outbox row, the deterministic accounting reference and the visible blocked
   state before retry.
8. Run the event through the scheduled processor or the approved operational
   trigger. Verify the approved provider object, including contact, date,
   currency, item, category, tax and amount when the approved consequence is
   invoice-producing.
9. Replay the worker and confirm no second invoice is created.
10. Exercise the approved timeout/unknown test seam, reconcile the existing
   provider invoice and confirm the external reference is stored.
11. Exercise a retryable provider result and confirm bounded backoff, then
    inspect the admin retry audit record.
12. Verify that replacing or removing a mapping is blocked while dependent
    accounting work is active and permitted only after the dependency is
    resolved.

## Production

1. Record sandbox evidence and obtain explicit go/no-go approval.
2. Configure production credentials through the approved secret channel.
3. Confirm `production` environment and the independently verified company
   subdomain.
4. Re-verify the approved production contact and invoice mapping.
5. Approve exactly one controlled production accounting event.
6. Process it once and independently verify the provider reference and object.
7. Verify that operational deletion does not erase the accounting reference or
   retry audit history.
8. Run the complete local suite and production perimeter smoke.
9. Record the exact deployed source commit, Worker version, D1 migration state,
   provider reference and retention result.
10. Create and push `phase-6-complete` only after every closure item is
    evidenced.
