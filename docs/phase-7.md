# Phase 7 — Billing engine and long-term operations hardening

## Current status

Phase 7 has a deployed operational baseline and the current increment is
Phase 7.14. The release repairs environment-bound Production contact
verification and the recurring-series Worker 1101 response path while
preserving the existing FreeAgent-to-GoCardless authority boundary.

The supplied HAR proves the complete Production authorization journey through
the FoxTutor callback. Authenticated Production contact and recurring-series acceptance still
requires an administrator browser run. No Production financial acceptance is
claimed.

## Deployed baseline

- Source commit: `b7cb157edb71e8722a41d2ba302b8f4848ad1142`
- Worker version: `08ae3704-1724-4075-8e85-fd5a14a1560e`
- Environment: FreeAgent Sandbox / production Cloudflare Worker boundary
- D1 migrations: `0001` through `0030_freeagent_dual_connections.sql`
- Scheduler: `*/5 * * * *`
- Business timezone: `Europe/London`
- Automated validation: 38 test files and 244 passing tests

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
- Production callback diagnostics for state validation, token exchange,
  company verification, token persistence and connection persistence.
- `last_success_at` persistence, stale-error clearing and explicit
  `ATTENTION` status on callback failure.
- Fixed FoxTutor sales-category policy resolution using the approved Sandbox
  reference, with explicit ambiguity and no-match exceptions.
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
| 7.13 | Production OAuth callback completion, verified persistence and fixed sales-category mapping |
| 7.14 | Production contact reconciliation and recurring-series 1101 repair |

The absence of a separate 7.3 file is intentional historical numbering; no
unrecorded completion claim is made for that increment.

## Acceptance boundary

Controlled local tests and schema checks are not evidence of provider
acceptance. No real Sandbox invoice, credit note, collection, payment or
mandate mutation is claimed by the current records. Cancellation after an
issued invoice remains an explicit reconciliation path because the public
FreeAgent API documentation does not provide a safe credit-note matching
operation.

The historical Phase 7.4 record retains the diagnosis and regression evidence
for the student billing Worker 1101 D1 query failure. The current recurring
series response defect and its fix are recorded in the Phase 7.14 records.

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
- [`docs/phase-7.11.md`](phase-7.11.md) — historical provider-contract and
  OAuth routing repair.
- [`docs/phase-7.12.md`](phase-7.12.md) — historical independent
  Sandbox/Production connection model.
- [`docs/phase-7.13.md`](phase-7.13.md) — historical Production callback,
  connection verification and fixed category mapping.
- [`docs/phase-7.14.md`](phase-7.14.md) — current contact reconciliation,
  recurring-series response repair and remaining live acceptance.
