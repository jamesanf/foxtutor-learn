# Phase 7 — Billing engine and long-term operations hardening

## Current status

Phase 7 has a deployed operational baseline, but it is **not complete** and
must not be treated as production-ready. The implementation covers recurring
lessons, lesson-level billing, customer credit, payment readiness, alerts and
reconciliation state. The deployed release is still awaiting:

- diagnosis and repair of the authenticated `/learn/student/billing` Worker
  1101 failure reported on 2026-09-14;
- authenticated runtime acceptance of the Phase 7 student and admin surfaces;
- controlled FreeAgent Sandbox financial acceptance;
- observed payment/Direct Debit lifecycle evidence through the existing
  FreeAgent-GoCardless path; and
- the remaining commercial/accounting approvals required before financial
  mutations can be enabled.

## Deployed baseline

- Source commit: `9da2c03`
- Worker version: `bba7fcaf-dfa6-42dd-aa77-11ac66e04125`
- Environment: FreeAgent Sandbox / production Cloudflare Worker boundary
- D1 migrations: `0001` through `0024_phase72_global_timezone_operations.sql`
- Scheduler: `*/5 * * * *`
- Business timezone: `Europe/London`
- Automated baseline: 31 test files and 169 passing tests, as recorded by the
  current deployment documentation

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

## Acceptance boundary

Controlled local tests and schema checks are not evidence of provider
acceptance. No real Sandbox invoice, credit note, collection, payment or
mandate mutation is claimed by the current records. Cancellation after an
issued invoice remains an explicit reconciliation path because the public
FreeAgent API documentation does not provide a safe credit-note matching
operation.

The known student billing 1101 must be diagnosed from the authenticated
runtime, fixed at the root cause and covered by a regression test before this
phase can move beyond its current gate. Until then the status is **NOT READY**.

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
