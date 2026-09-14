# Phase 6 - Current status and evidence

## Status

**PHASE 6 STATUS: TECHNICALLY COMPLETE - LIVE SANDBOX ACCEPTANCE NOT STARTED**

The application-side accounting implementation is complete and hardened. The
latest attempted live-acceptance handoff supplied literal placeholders rather
than executable approvals for the `ADMIN_CANCELLED` consequence,
effective-date policy and FreeAgent billing/category configuration. Those
values cannot be inferred or persisted. No provider evidence, credential or
commercial approval is invented here, and no real Sandbox financial mutation
has been attempted.

This is the single current Phase 6 status record. The supporting architecture,
security, testing, deployment and handover records in this directory are the
only current Phase 6 documents; historical release chronology is preserved in
`docs/CHANGELOG.md`.

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
- Billing settings exposes the connected company identity and
  **Reauthenticate FreeAgent** action; the accounting page uses a matching
  settings cog and Billing settings uses a matching back arrow.
- Contact mappings use compact accessible save/remove icon controls without a
  forced horizontal table width. The contact-ID field has a fixed compact
  width, and the redundant FreeAgent-contact display column has been removed;
  automatic provider contact synchronization remains future work.
- The deployed contact persistence defect was fixed: the
  `external_accounting_links` insert now supplies exactly 15 values for its
  15 declared columns. A regression verifies a successful `VERIFIED` link
  through `verifyFreeAgentContactMapping()`.

## Evidence matrix

| Requirement | Source of truth | Evidence | State |
| --- | --- | --- | --- |
| Cancellation consequence mapping | `src/domain/accounting.ts`, Phase 5 history | `tests/unit/accounting.test.ts`, `tests/integration/accounting.test.ts` | IMPLEMENTED - APPROVED HUMAN CONTRACT VALUE STILL REQUIRED |
| Durable outbox and event identity | `migrations/0016_accounting_outbox.sql`, `src/db/accounting.ts` | Migration tests and transaction-boundary tests | COMPLETE |
| Database uniqueness and retention | `migrations/0016_accounting_outbox.sql` | Forward migration checks; D1 production state | COMPLETE |
| Accounting status machine | `src/domain/accounting.ts`, `src/db/accounting.ts` | Transition and retry tests; guarded SQL updates | COMPLETE |
| Retry and stale-worker handling | `src/db/accounting.ts`, `src/accounting/service.ts` | Backoff, timeout and unknown tests | COMPLETE |
| FreeAgent adapter boundary | `src/accounting/freeagent/client.ts` | URL, payload, error and timeout tests | COMPLETE |
| OAuth state and encrypted tokens | `src/accounting/credentials.ts`, `src/accounting/service.ts` | OAuth exchange/refresh and secret-boundary tests | COMPLETE - PROVIDER ACCEPTANCE ONLY REMAINS |
| Environment/company pinning | `src/accounting/service.ts` | Configuration and company checks | COMPLETE - PROVIDER ACCEPTANCE ONLY REMAINS |
| Contact mapping | `src/accounting/service.ts`, `src/db/accounting.ts` | Admin route, verification, replacement/removal guards; live D1 has one `VERIFIED` Sandbox mapping for contact `257175` and no conflict | COMPLETE |
| Invoice mapping | `src/accounting/service.ts`, `src/db/accounting.ts`, adapter payload | Persisted admin settings, immutable GBP, fixed-decimal amount, explicit tax, category/payment/date validation; live billing-settings row is empty because the submitted mapping was a placeholder | IMPLEMENTED - APPROVED PROVIDER MAPPING REQUIRED |
| Billing management | `/learn/admin/accounting/settings`, `accounting_billing_settings` | Admin GET/POST form, connection identity/status, reauthentication, CSRF, validation, actor/timestamp persistence and invoice consumption | COMPLETE |
| Reconciliation | `src/accounting/service.ts`, admin reconcile route | Unknown-state and provider-reference seams | COMPLETE - PROVIDER ACCEPTANCE ONLY REMAINS |
| Manual retry audit | `migrations/0017_accounting_operations.sql`, `src/db/accounting.ts` | Additive actor/state audit path | COMPLETE |
| Authorization and CSRF | `src/auth/authorization.ts`, `src/worker/index.ts` | Admin/student route classification and CSRF checks | COMPLETE |
| Operational/accounting separation | D1 foreign keys and deletion guards | Migration and retention design | COMPLETE |
| Browser/admin console | `src/worker/index.ts`, `public/learn.css` | Browser shell contract and deployed route | COMPLETE - AUTHENTICATED ACCEPTANCE ONLY REMAINS |
| Production deployment | `docs/deployment/phase-6.md` | Worker, route and D1 verification | COMPLETE |
| Sandbox mutation | External FreeAgent sandbox | OAuth/company connection and contact mapping are complete; the latest approval fields are placeholders, so acceptance has not started and no mutation was attempted | BLOCKED - INVALID/MISSING APPROVAL INPUT |
| Production mutation | External FreeAgent production | No credentials or approval supplied | BLOCKED - EXTERNAL HUMAN GATE |

## Current deployed distinction

These values must always be reported separately:

- **Repository HEAD:** `52611e2`; documentation-only reconciliation commits
  may follow the executable deployment.
- **Deployed source commit:** `4afa705`.
- **Deployed Worker version:** `71accc39-6c06-4fc7-9390-12afcf48add1`.
- **D1 state:** production migrations through
  `0020_accounting_company_name.sql`, with no pending migration reported
  after deployment of the executable change.
- **OAuth state:** Sandbox secrets and company pin are configured; OAuth
  completed successfully for Fox Learning Ltd and encrypted tokens are
  persisted in `accounting_connections`. No financial mutation has occurred.
- **Callback perimeter:** only
  `/learn/admin/accounting/oauth/callback` bypasses Cloudflare Access. The
  Worker requires a one-time OAuth state bound to an active administrator;
  `/learn/admin` and all other accounting routes remain Access-protected.

Wrangler reports the deployment source metadata as `Unknown`; the deployed
source commit is the reviewed executable commit from which the deployment was
run. The repository HEAD may move after this deployment for documentation-only
reconciliation and must not be conflated with the deployed source commit.

Documentation-only commits after an executable deployment do not change the
deployed source commit.

## Human acceptance checklist

The current live Sandbox evidence is:

- `accounting_connections`: one `CONNECTED` Sandbox connection for Fox
  Learning Ltd / `foxlearningltdgmailcom`; encrypted access and refresh
  material is present, and no credential values are exposed.
- `external_accounting_links`: exactly one `VERIFIED` mapping for contact
  `257175`, with no conflicting mapping.
- `accounting_billing_settings`: zero rows because no approved FreeAgent
  category/accounting mapping has been supplied.
- `accounting_outbox` and `accounting_retry_audit`: zero rows; no financial
  mutation has been performed.
- Production D1 reports no migrations to apply and the deployed callback
  rejects an invalid state at the Worker boundary.

The latest acceptance handoff supplied these literal placeholder values:

- `ADMIN_CANCELLED` consequence: `[INSERT APPROVED CONSEQUENCE]`
- effective-date policy: `[INSERT APPROVED POLICY]`
- billing/accounting configuration:
  `[INSERT APPROVED CATEGORY / ITEM / TAX / PAYMENT TERMS / OTHER VALUES]`

They are recorded here only to explain why the gate remains closed; they are
not configuration and must never be written to D1 or used for a provider
request.

Only the following external actions remain:

1. Replace the three literal placeholders with the exact approved
   `ADMIN_CANCELLED` consequence, effective-date policy and
   FreeAgent billing/category values. The agent cannot infer these decisions.
2. Persist the approved billing configuration through the normal admin path
   and verify the D1 row before creating an event. GBP remains immutable.
3. Create or select the approved `ADMIN_CANCELLED` event. If the approved
   consequence is `NO_ACTION`, verify the durable `NOT_REQUIRED` outcome and
   do not call FreeAgent. If it is invoice-producing, continue through the
   real Sandbox invoice, replay, retry and reconciliation checks.
4. Record the real Sandbox provider evidence, including the exact invoice
   identifier when an invoice is approved.
5. Supply production credentials through the approved secret channel.
6. Verify the production company and repeat the approved mapping checks.
7. Approve and execute exactly one controlled production accounting event.
8. Independently verify the provider object and retention result.

There are no unresolved implementation TODOs in this checklist. The next
technical acceptance step is gated solely by the missing executable approval
values above.

## Closure requirement

Create and push `phase-6-complete` only after the external acceptance evidence
is recorded, the final executable commit is deployed, the Worker version and
D1 state are independently verified, and the production provider object and
retention behavior are confirmed. Until then:

`phase-6-complete: NOT CREATED - external acceptance outstanding`
