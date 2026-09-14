# Phase 6 - External acceptance runbook

This runbook contains no secrets. The Sandbox bindings are configured in the
Worker and the Fox Learning Ltd OAuth connection is active with encrypted
tokens persisted in D1. Contact `257175` is currently verified for the Learn
student with no conflicting mapping. The live billing-settings row, outbox and
retry audit are empty, and no financial mutation has been performed.

The latest acceptance handoff supplied literal placeholders rather than
executable approvals for the `ADMIN_CANCELLED` consequence, effective-date
policy and FreeAgent billing/category configuration. Do not persist or use
those strings. Production remains gated on the same commercial decision,
separate production credentials and controlled provider verification.

## Sandbox

0. Replace the literal placeholders with the exact approved consequence,
   effective-date policy and FreeAgent billing/category values. Do not
   continue with a financial event until these values are explicit.
1. Confirm the configured Sandbox environment, exact registered callback URI,
   company subdomain and approved provider mapping values. Review the admin
   billing-management page:
   GBP is immutable, and the item type, category, payment terms and explicit
   sales-tax rate must match the approved values. The normal 55.00 GBP and
   zero-tax values are defaults only.
2. Decide the `ADMIN_CANCELLED` accounting consequence before creating or
   processing an administrative-cancellation invoice event. The system will
   not infer invoice creation or no action.
3. Confirm the configured environment is `sandbox` and the callback exactly
   matches the registered URI.
4. As an admin, open `/learn/admin/accounting` and confirm the green
   **FreeAgent integration active** tag in Billing settings. Review the
   environment, company name and company subdomain shown there. Use
   **Reauthenticate FreeAgent** only when a fresh OAuth authorization is
   required; this refreshes the persisted company identity.
5. For a fresh authorization, verify the returned company subdomain and
   confirm the connection status. The exact callback path bypasses Cloudflare
   Access, but the Worker accepts it only with the one-time admin-bound OAuth
   state. If the callback returns 502, inspect the safe stage-labelled Worker
   diagnostic and repeat only after identifying the failing stage.
6. The current approved test payer mapping is already verified as contact
   `257175` in D1. Do not replace or remove it unless an approved mapping
   change is required and no active accounting dependency exists.
7. After the approvals are persisted, create or select the approved
   `ADMIN_CANCELLED` test event. Confirm exactly one outbox row or, for an
   approved no-action consequence, exactly one durable `NOT_REQUIRED` outcome.
8. For an invoice-producing consequence, run the event through the scheduled
   processor or approved operational trigger and verify the real provider
   object, including contact, date, currency, item, category, tax and amount.
   For a no-action consequence, verify that no FreeAgent request occurs.
9. Replay the worker and confirm no second invoice is created.
10. Exercise the approved timeout/unknown test seam, reconcile the existing
   provider invoice and confirm the external reference is stored.
11. Exercise a retryable provider result and confirm bounded backoff, then
    inspect the admin retry audit record.
12. Verify that replacing or removing a mapping is blocked while dependent
    accounting work is active and permitted only after the dependency is
    resolved.

The deployed contact-mapping insert defect has been corrected and covered by a
successful D1 persistence regression. If verification still fails, inspect
the safe `D1 mapping persistence` diagnostic before changing provider
configuration or contact mappings.

Current repository HEAD is `52611e2`; deployed executable source is `4afa705`
and the deployed Worker version is
`71accc39-6c06-4fc7-9390-12afcf48add1`.

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
