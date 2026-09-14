# Phase 7 — Billing engine and long-term operations hardening

## Current status

Phase 7 has a deployed operational baseline, but it is **not complete** and
must not be treated as production-ready. The current increment is Phase 7.12,
which replaces the ambiguous single FreeAgent connection action with
independent Sandbox and Production connections while preserving the existing
FreeAgent-to-GoCardless authority boundary. The release is still awaiting:

- Production FreeAgent credentials and human OAuth authorization;
- read-only Production company, James contact and mandate verification;
- live Sandbox category response evidence and explicit approved category
  selection; and
- any later, separately authorized financial acceptance.

The current provider acceptance gate is Phase 7.12. It remains **NOT READY —
PRODUCTION FREEAGENT AUTHORIZATION REQUIRED** because Production credentials
and human authorization are not available in this execution context. The
earlier Phase 7.5 financial safety gate remains part of the historical
acceptance record; it is not superseded by this provider-contract repair.

## Deployed baseline

- Source commit: `7ef5c76`
- Worker version: `46e84b42-6201-4141-ad7e-f567ddd45b80`
- Environment: FreeAgent Sandbox / production Cloudflare Worker boundary
- D1 migrations: `0001` through `0030_freeagent_dual_connections.sql`
- Scheduler: `*/5 * * * *`
- Business timezone: `Europe/London`
- Automated validation: 38 test files and 232 passing tests

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
- Independent `FREEAGENT:SANDBOX` and `FREEAGENT:PRODUCTION` connections with
  explicit admin actions, environment-bound OAuth state, credentials, tokens,
  company verification and encrypted token keys.
- Environment-bound FreeAgent OAuth using the selected Sandbox or Production
  API origin, credential set, token endpoint and company mapping.
- Documented FreeAgent category normalization across
  `admin_expenses_categories`, `cost_of_sales_categories`, `income_categories`
  and `general_categories`, with readable labels, search, deduplication and
  environment validation.

The Phase 7.5 executable deployment was made at
`2026-09-14T17:10:45Z`. The unauthenticated perimeter probe returned the
expected Cloudflare Access challenge; authenticated application acceptance
remains open.

## Phase 7 increment chronology

| Increment | Recorded boundary |
| --- | --- |
| 7.1 | Recurring lessons, billing orchestration and payment readiness foundation |
| 7.2 | Billing engine completion and operationalisation |
| 7.3 | No separate repository record; intervening technical work was absorbed into the 7.2 operationalisation and later remediation records |
| 7.4 | Student billing Worker 1101 forensic diagnosis and D1 query repair |
| 7.5 | Financial safety state model and acceptance gate |
| 7.6 | Direct Debit-first provisioning, emergency policy and sentinel |
| 7.7 | Mandate/payment chain validation and reconciliation |
| 7.8 | FreeAgent billing acceptance finalisation |
| 7.9 | Sandbox/Production environment isolation |
| 7.10 | Category mapping and broad environment/accounting plumbing |
| 7.11 | Provider contract and initial environment-aware OAuth routing |
| 7.12 | Independent Sandbox/Production connections and explicit admin actions |
| 7.11 | Provider category-contract repair and environment-specific OAuth routing |

The absence of a separate 7.3 file is intentional historical numbering; no
unrecorded completion claim is made for that increment.

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
- [`docs/phase-7.5-financial-acceptance-report.md`](phase-7.5-financial-acceptance-report.md) —
  financial safety acceptance boundary.
- [`docs/phase-7.6.md`](phase-7.6.md) — Direct Debit-first provisioning and
  reliability.
- [`docs/phase-7.7.md`](phase-7.7.md) — mandate/payment chain validation.
- [`docs/phase-7.8.md`](phase-7.8.md) — FreeAgent acceptance finalisation.
- [`docs/phase-7.9.md`](phase-7.9.md) — environment isolation.
- [`docs/phase-7.10.md`](phase-7.10.md) — category mapping preparation.
- [`docs/phase-7.11.md`](phase-7.11.md) — current provider-contract and OAuth
  routing repair.
