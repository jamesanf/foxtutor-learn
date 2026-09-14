# Phase 7.5 Financial Acceptance Report

## 1. Current status

**NOT READY.**

Engineering work has added a privacy-safe Direct Debit status journey and
formalised the financial state/invariant model. Mandatory provider, failure
injection, authenticated browser, reconciliation, and production-pilot
evidence is not complete.

## 2. 1101 status

The historical billing-page Worker 1101 remains permanently covered by
`tests/unit/billing-history.test.ts`. The regression rejects the former
compound `UNION ALL` query shape and verifies six bounded independent queries,
deterministic ordering, and the overall limit.

## 3. Automated test totals

The current suite has **33 test files and 181 passing tests**, including nine
Direct Debit mapping/privacy tests and the permanent billing-history 1101
regression. This is engineering evidence only; it does not include provider
Sandbox mutations or authenticated deployed-browser checks.

## 4. Billing test coverage

Existing evidence covers bounded billing-history reads, deterministic merge
ordering, local billing-event creation, invoice idempotency seams, payment
readiness, and provider-operation state handling. Comprehensive D1 integration
coverage for all failure and concurrency cases remains open.

## 5. Credit test coverage

Existing evidence covers exact minor-unit allocation, oldest-first allocation
seams, full/partial/excess credit, idempotency keys, reversal semantics and
refund authorization. Concurrent D1 trigger/ledger acceptance remains open.

## 6. Recurrence test coverage

Existing evidence covers the six-week window, end dates, pauses, London DST
conversion and timezone rejection. Scheduler replay, missed invocation and
concurrent materialisation evidence remains open.

## 7. Payment/Direct Debit test coverage

The provider seam maps `setup`, `pending`, `active`, `inactive`, `failed`,
missing and unknown states without exposing raw provider data. The student
page explains secure authorisation, pending timing, active/failed/unknown
states and the support route. Real mandate and collection lifecycle evidence
through FreeAgent-GoCardless remains open.

## 8. Reconciliation test coverage

Local reconciliation and unknown-state paths exist, but no real Sandbox
provider/local mismatch and recovery evidence is claimed.

## 9. Security/privacy test coverage

Student queries remain ownership-scoped. Customer billing HTML omits provider
references, mandate identifiers, internal billing IDs, bank details and other
student data. Cross-student authenticated browser evidence remains open.

## 10. Student billing deployed acceptance

Not evidenced in this execution environment. The post-deployment perimeter
probe returned the expected Access `302` challenge with Ray ID
`a3b101c73dfe2581-MAN`; an Access challenge is not application acceptance.

## 11. Admin billing deployed acceptance

Not evidenced in this execution environment. A Cloudflare Access challenge is
not application acceptance.

## 12. FreeAgent Sandbox evidence

No controlled invoice, credit note, collection, payment, mandate, replay, or
cancellation correction mutation is claimed.

## 13. Direct Debit evidence

The intended workflow remains FreeAgent-managed GoCardless. FreeAgent's
customer email authorisation flow and up-to-three-working-day setup timing are
documented, but observed mandate transitions and collection settlement are
not yet recorded.

## 14. Direct Debit customer instructions

FoxTutor sends a secure authorisation request by email. The customer opens the
request directly, enters bank details only in the provider's secure mandate
flow, returns to FoxTutor Learn, and checks the displayed status. Setup may
remain pending for up to three working days. Missing or expired requests are
handled through `hello@foxtutor.org`. The page does not expose provider
customer IDs, mandate IDs, invoice references, internal billing IDs, account
numbers, or sort codes.

## 15. Reconciliation evidence

No real provider/local mismatch and recovery scenario is claimed.

## 16. Alert evidence

Local alert creation, deduplication, acknowledgement and resolution paths
exist. A complete generated/acknowledged/resolved evidence ledger remains open.

## 17. Financial invariants

The invariant set is defined in `docs/testing/phase-7.5.md`. No failed
invariant is claimed; several invariants still require D1 integration,
concurrency, provider Sandbox, and replay evidence.

## 18. Known limitations

- No real FreeAgent Sandbox financial mutation evidence.
- No observed mandate lifecycle or collection settlement evidence.
- No authenticated student/admin browser acceptance from this environment.
- No complete concurrency/failure-injection/reconciliation evidence ledger.
- No approved production accounting/payment configuration.
- No controlled production pilot approval.

## 19. Human approval gates

Only genuine commercial decisions remain human gates: approved accounting
category/tax treatment, cancellation accounting consequence, production
FreeAgent/payment activation, and controlled production pilot approval.

## 20. Production pilot

**Not ready.** A pilot procedure must be approved only after Sandbox and
engineering evidence is complete.

## 21. Deployment

The tested and deployed source is
`1be5758248b01e1942e74f05b0ae86f552f40baf`, Worker version
`e8dff528-34c6-48d6-90c6-9dedaec2df10`, deployed at
`2026-09-14T17:10:45Z`. D1 migrations remain through
`0024_phase72_global_timezone_operations.sql`, with no migrations to apply,
and scheduler `*/5 * * * *`.

## 22. Documentation

This report and `docs/testing/phase-7.5.md` are new. The current Phase 7
summary, runbook, README, and changelog must be updated with the final
post-deployment evidence before any exit decision.

## 23. Git

The documentation follow-up is on branch `main`; final HEAD and clean/dirty
state are recorded after this documentation commit. The deployed executable
commit remains the source commit above.
