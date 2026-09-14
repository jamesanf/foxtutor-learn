# Phase 7 — Billing engine and long-term operations hardening

## Current status

Phase 7 has a deployed operational baseline, but it is **not complete** and
must not be treated as production-ready. The implementation covers recurring
lessons, lesson-level billing, customer credit, payment readiness, alerts and
reconciliation state. Phase 7.4 diagnosed and repaired the billing route
failure, but the release is still awaiting:

- authenticated post-deployment acceptance of `/learn/student/billing`;
- authenticated runtime acceptance of the Phase 7 student and admin surfaces;
- controlled FreeAgent Sandbox financial acceptance;
- observed payment/Direct Debit lifecycle evidence through the existing
  FreeAgent-GoCardless path; and
- the remaining commercial/accounting approvals required before financial
  mutations can be enabled.

Phase 7.5 is the active financial acceptance gate. It remains **NOT READY**:
the customer-facing Direct Debit status journey and formal state/invariant
model are now recorded, but comprehensive failure-injection, concurrency,
reconciliation, Sandbox financial, and authenticated browser evidence is not
complete.

## Deployed baseline

- Source commit: `1be5758`
- Worker version: `e8dff528-34c6-48d6-90c6-9dedaec2df10`
- Environment: FreeAgent Sandbox / production Cloudflare Worker boundary
- D1 migrations: `0001` through `0024_phase72_global_timezone_operations.sql`
- Scheduler: `*/5 * * * *`
- Business timezone: `Europe/London`
- Automated validation: 32 test files and 171 passing tests

The release keeps FoxTutor authoritative for recurring series, lesson
instances, billing events, credit, readiness and operational audit. FreeAgent
remains authoritative for accounting documents and payment state exposed by
its API. The existing FreeAgent-GoCardless relationship remains the only
Direct Debit authority; FoxTutor does not create a parallel mandate.

## Implemented scope

- Six-week bounded recurring-lesson materialisation with pause, resume,
  reschedule, cancellation and end-date handling.
- Deterministic lesson-level billing events and replay-safe provider
  operations.
- Immutable customer-credit ledger with oldest-first allocation, compensating
  reversals and no zero-value provider invoices.
- London calendar-date collection eligibility, distinct payment-readiness
  states, provider status refresh and reconciliation tasks.
- Deduplicated billing alerts with acknowledgement and resolution audit.
- Student billing visibility and admin billing operations surfaces.
- Privacy-safe student Direct Debit status mapping for FreeAgent's
  `setup`, `pending`, `active`, `inactive`, `failed` and unknown states.
- Customer instructions that keep bank details inside the provider mandate
  flow and omit provider/internal references from student billing HTML.

The Phase 7.5 executable deployment was made at
`2026-09-14T17:10:45Z`. The unauthenticated perimeter probe returned the
expected Cloudflare Access challenge; authenticated application acceptance
remains open.

## Acceptance boundary

Controlled local tests and schema checks are not evidence of provider
acceptance. No real Sandbox invoice, credit note, collection, payment or
mandate mutation is claimed by the current records. Cancellation after an
issued invoice remains an explicit reconciliation path because the public
FreeAgent API documentation does not provide a safe credit-note matching
operation.

The reported student billing 1101 has been diagnosed from the deployed
dependency path, fixed at the root cause and covered by a regression test.
Phase 7.4 established the root cause:
the six-way `UNION ALL` in `listBillingHistory` exceeded the production D1
compound-select limit and raised `SQLITE_ERROR: too many terms in compound
SELECT` (Cloudflare D1 error code `7500`). The query failed even for the
real empty-billing student state, so `Promise.all` propagated the D1 rejection
as Worker 1101. The fix is deployed and the split queries execute successfully
against remote D1. The authenticated page has not been accepted from this
execution environment because no legitimate Cloudflare Access student session
is available. The status therefore remains **NOT READY**.

## Detailed records

The decimal records remain useful evidence and implementation history:

- [`docs/phase-7.1.md`](phase-7.1.md) — foundational scope and provider
  decisions.
- [`docs/phase-7.2.md`](phase-7.2.md) — detailed operational implementation
  boundary.
- [`docs/phase-7.2-acceptance-report.md`](phase-7.2-acceptance-report.md) —
  deployment and provider-evidence boundary.
- [`docs/architecture/phase-7.2.md`](architecture/phase-7.2.md) — current
  billing operations architecture.
- [`docs/testing/phase-7.2.md`](testing/phase-7.2.md) — controlled test
  coverage and evidence classification.
- [`docs/deployment/phase-7.2.md`](deployment/phase-7.2.md) — deployment
  metadata and migration record.
- [`docs/handover/phase-7.2.md`](handover/phase-7.2.md) — outstanding
  operational and human gates.
- [`docs/phase-7.4.md`](phase-7.4.md) — forensic diagnosis, regression,
  deployment evidence and remaining authenticated-runtime gate.
