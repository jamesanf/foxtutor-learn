# Phase 6 - External acceptance runbook

This runbook contains no secrets. The Sandbox bindings are configured in the
Worker and the Fox Learning Ltd OAuth connection is active with encrypted
tokens persisted in D1. Contact `257175` is currently verified for the Learn
student with no conflicting mapping. The live outbox and retry audit are
empty, and no financial mutation has been performed. The remaining Sandbox
steps are the approved accounting/category mapping, provider acceptance and
mutation evidence. Production remains gated on commercial approval and
separate production credentials.

## Sandbox

1. Confirm the configured Sandbox environment, exact registered callback URI,
   company subdomain and approved provider mapping values. Review the admin
   billing-management page:
   the initial normal lesson setting is 55.00 GBP, GBP is immutable, and the
   item type, category, payment terms and explicit sales-tax rate are editable.
   Keep the sales-tax rate at `0` for the current non-VAT contract.
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
7. After the consequence and invoice/category mapping are approved, create or select the approved
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

The deployed contact-mapping insert defect has been corrected and covered by a
successful D1 persistence regression. If verification still fails, inspect
the safe `D1 mapping persistence` diagnostic before changing provider
configuration or contact mappings.

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
