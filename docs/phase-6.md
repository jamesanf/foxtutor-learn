# Phase 6 - Current status and evidence

## Status

**PHASE 6 STATUS: TECHNICALLY COMPLETE - EXTERNAL ACCEPTANCE BLOCKED**

The application-side accounting implementation is complete and hardened. The
remaining work requires a human-owned commercial decision, provider
credentials, provider-side acceptance and one controlled production
accounting event. No provider evidence, credential or commercial approval is
invented here.

This is the single current Phase 6 status record. The supporting architecture,
security, testing, deployment and handover records in this directory are the
only current Phase 6 documents; historical release chronology is preserved in
`CHANGELOG.md`.

## What Phase 6 guarantees

- Phase 5 cancellation and reschedule classifications are consumed through a
  separate accounting outbox.
- Business-event identity and provider references are durable and unique.
- No direct debit, card charge, payment collection or payment-method storage
  exists in Learn.
- Provider work is asynchronous and isolated behind the FreeAgent adapter.
- Missing or ambiguous commercial mapping fails closed before provider
  mutation.
- Normal lesson accounting bootstraps at `55.00` GBP with no VAT charged.
  Admins can edit the amount, item type, category, payment terms and explicit
  sales-tax rate in billing management; GBP remains immutable. The current
  non-VAT setting sends FreeAgent `sales_tax_rate: "0"` explicitly.
- `ADMIN_CANCELLED` is stored as an unresolved accounting action until the
  owner approves its consequence; it cannot default to invoice creation or
  no action.
- Timeouts, network failures and uncertain mutation outcomes become
  `UNKNOWN`; they require reconciliation rather than blind recreation.
- Admin retries are CSRF-protected, state-checked and audit-recorded.
- Students cannot access accounting routes or objects.
- Operational deletion nulls local references without deleting authoritative
  accounting history or provider references.

## Evidence matrix

| Requirement | Source of truth | Evidence | State |
| --- | --- | --- | --- |
| Cancellation consequence mapping | `src/domain/accounting.ts`, Phase 5 history | `tests/unit/accounting.test.ts`, `tests/integration/accounting.test.ts` | COMPLETE - HUMAN CONTRACT VALUES STILL REQUIRED |
| Durable outbox and event identity | `migrations/0016_accounting_outbox.sql`, `src/db/accounting.ts` | Migration tests and transaction-boundary tests | COMPLETE |
| Database uniqueness and retention | `migrations/0016_accounting_outbox.sql` | Forward migration checks; D1 production state | COMPLETE |
| Accounting status machine | `src/domain/accounting.ts`, `src/db/accounting.ts` | Transition and retry tests; guarded SQL updates | COMPLETE |
| Retry and stale-worker handling | `src/db/accounting.ts`, `src/accounting/service.ts` | Backoff, timeout and unknown tests | COMPLETE |
| FreeAgent adapter boundary | `src/accounting/freeagent/client.ts` | URL, payload, error and timeout tests | COMPLETE |
| OAuth state and encrypted tokens | `src/accounting/credentials.ts`, `src/accounting/service.ts` | OAuth exchange/refresh and secret-boundary tests | COMPLETE - PROVIDER ACCEPTANCE ONLY REMAINS |
| Environment/company pinning | `src/accounting/service.ts` | Configuration and company checks | COMPLETE - PROVIDER ACCEPTANCE ONLY REMAINS |
| Contact mapping | `src/accounting/service.ts`, `src/db/accounting.ts` | Admin route, verification, replacement/removal guards | COMPLETE - HUMAN MAPPING REQUIRED |
| Invoice mapping | `src/accounting/service.ts`, `src/db/accounting.ts`, adapter payload | Persisted admin settings, immutable GBP, fixed-decimal amount, explicit tax, category/payment/date validation | COMPLETE - PROVIDER MAPPING VALUES REQUIRED |
| Billing management | `/learn/admin/accounting/settings`, `accounting_billing_settings` | Admin GET/POST form, CSRF, validation, actor/timestamp persistence and invoice consumption | COMPLETE |
| Reconciliation | `src/accounting/service.ts`, admin reconcile route | Unknown-state and provider-reference seams | COMPLETE - PROVIDER ACCEPTANCE ONLY REMAINS |
| Manual retry audit | `migrations/0017_accounting_operations.sql`, `src/db/accounting.ts` | Additive actor/state audit path | COMPLETE |
| Authorization and CSRF | `src/auth/authorization.ts`, `src/worker/index.ts` | Admin/student route classification and CSRF checks | COMPLETE |
| Operational/accounting separation | D1 foreign keys and deletion guards | Migration and retention design | COMPLETE |
| Browser/admin console | `src/worker/index.ts`, `public/learn.css` | Browser shell contract and deployed route | COMPLETE - AUTHENTICATED ACCEPTANCE ONLY REMAINS |
| Production deployment | `docs/deployment/phase-6.md` | Worker, route and D1 verification | COMPLETE |
| Sandbox mutation | External FreeAgent sandbox | No credentials supplied; normal lesson values are known | BLOCKED - EXTERNAL CREDENTIAL |
| Production mutation | External FreeAgent production | No credentials or approval supplied | BLOCKED - EXTERNAL HUMAN GATE |

## Current deployed distinction

These values must always be reported separately:

- **Repository HEAD at executable deployment:** `49c08ec8ed1cc6623404620fa080c1dad64a10c8`.
- **Deployed source commit:** `49c08ec8ed1cc6623404620fa080c1dad64a10c8`.
- **Deployed Worker version:** `5e9bc089-8e4d-4f12-9f40-ce5539c6eb4f`.
- **D1 state:** production migrations through
  `0019_accounting_billing_settings.sql`, with no pending migration reported
  after deployment of the executable change.

Wrangler reports the deployment source metadata as `Unknown`; the deployed
source commit is the reviewed executable commit from which the deployment was
run. The repository HEAD may move after this deployment for documentation-only
reconciliation and must not be conflated with the deployed source commit.

Documentation-only commits after an executable deployment do not change the
deployed source commit.

## Human acceptance checklist

Only the following external actions remain:

1. Decide whether `ADMIN_CANCELLED` produces no accounting action, a
   55.00 GBP no-VAT invoice, another accounting consequence, or a
   compensating/credit action.
2. If `ADMIN_CANCELLED` produces a provider action, approve its payer/contact
   authority, item/category, payment terms and effective-date policy. Review
   the current billing-management values; GBP is always enforced and the
   initial normal lesson amount is 55.00 GBP with an explicit zero tax rate.
3. Supply sandbox FreeAgent client credentials and the encryption key through
   the approved secret channel.
4. Complete sandbox OAuth and verify the pinned company.
5. Supply and verify the approved sandbox contact and provider mappings.
6. Run the approved sandbox event only after the `ADMIN_CANCELLED`
   consequence is decided, then verify the provider object.
7. Supply production credentials through the approved secret channel.
8. Verify the production company and repeat the approved mapping checks.
9. Approve and execute exactly one controlled production accounting event.
10. Independently verify the provider object and retention result.

There are no technical TODOs in this checklist.

## Closure requirement

Create and push `phase-6-complete` only after the external acceptance evidence
is recorded, the final executable commit is deployed, the Worker version and
D1 state are independently verified, and the production provider object and
retention behavior are confirmed. Until then:

`phase-6-complete: NOT CREATED - external acceptance outstanding`
