# Phase 7.4 — Student billing Worker 1101 forensic report

## Status

**NOT READY — root cause fixed and deployed; authenticated runtime acceptance
remains an explicit gate.**

The execution environment did not contain a legitimate Cloudflare Access
student session. A direct request therefore returned the Access login redirect
and was not counted as an application-route test. No security bypass or
temporary authentication change was introduced.

## 1. Exact 1101 diagnosis

The failing operation was `listBillingHistory` in
`src/db/billing.ts` (the former query began at line 1017 in the deployed
source). It used one compound SQL statement containing six `UNION ALL`
branches for lesson charges, cancellations, credits, credit-ledger
transactions, invoices and payments.

Executing that exact query against production D1 produced:

```text
SQLITE_ERROR: too many terms in compound SELECT
Cloudflare D1 error code: 7500
```

Cloudflare Workers observability independently recorded the historical
invocation at `2026-09-14T16:39:20Z` as `scriptThrewException`, with one
request, one error and deployed version
`bba7fcaf-dfa6-42dd-aa77-11ac66e04125`. This matches the reported Ray ID
`a3b0d3bf8bfb075e`; the aggregate trace does not expose a source stack, so the
remote D1 reproduction identifies the exact throwing operation and exception.

The exception occurred even though the active student had no billing events,
credits, invoices or payments. The real remote data had one cancellation
history row, and the compound query was rejected before returning it. The
history promise rejected inside the route's `Promise.all`, which propagated
through the Worker request and surfaced as Cloudflare Error 1101.

The active remote student used for diagnosis was `learn-student-test` /
`2dba78cd-0ce9-4aa2-918f-c3fb9d3b683b`. No financial mutation was performed.

## 2. Root cause

The local SQLite test seam did not reproduce Cloudflare D1's production
compound-select limit. The source query was logically valid SQLite but was not
valid for the deployed D1 execution limit. This was a query-shape and
environment-specific runtime defect, not a null amount, BigInt, date or
renderer failure.

## 3. Fix

`listBillingHistory` now runs six bounded, independently prepared D1 queries in
parallel, then merges, sorts by `occurred_at DESC, id DESC`, and applies the
same overall limit in TypeScript. The route also has permanent safe stage
diagnostics and tolerant money/date conversion for null, missing, string and
invalid legacy values. Diagnostics log only route/entity IDs, stage names, exception class and
truncated safe messages; cookies, OAuth tokens and payment secrets are not
logged.

## 4. Regression test

`tests/unit/billing-history.test.ts` — “avoids the production D1
compound-select failure when billing is empty” rejects any attempted
`UNION ALL` query with the exact production error and verifies that the
replacement returns an empty history through six independent statements.
The same suite verifies deterministic merge ordering and the overall limit.

## 5. Existing test suite

Before the fix: 31 test files and 169 passing tests.

After the fix: **32 test files and 171 passing tests**; no failures or skips.
The new file adds two tests, including the exact 1101 regression.

## 6. Student billing runtime evidence

- Source commit `042d3e6` deployed at 2026-09-14 16:46:25 UTC.
- Worker version: `7a9b7b0f-40ca-44b3-9698-2a216708f5bb`.
- Direct unauthenticated HTTP probe returned the Cloudflare Access login
  redirect, not the application page; this is not counted as acceptance.
- A fresh authenticated page load could not be performed from this environment
  without a legitimate Access session.

## 7. Empty-state evidence

Production D1 currently has zero `billing_events`, zero `customer_credits`,
zero `billing_invoices` and zero `billing_payments` for the active test
student. The six replacement queries all executed successfully remotely and
returned zero rows where expected. The controlled regression renders this
empty history path without an exception.

## 8. Populated-state evidence

Production D1 contains one real cancellation-history row for the active
student. The cancellation branch returned successfully after deployment. No
invoice, payment or provider financial mutation was created, so a populated
invoice/payment page state remains unverified.

## 9. Admin billing evidence

The admin billing route shares the upcoming/credit queries, not the removed
compound history query. Its shared remote D1 schemas and queries were
verified, but authenticated admin route acceptance was not possible from this
environment.

## 10. D1 evidence

Remote `foxtutor-learn` schema contains the billing tables,
`customer_credit_balances` view and Phase 7 triggers. Wrangler reported no
migrations to apply; remote migrations remain through
`0024_phase72_global_timezone_operations.sql`. Each replacement history query
and the existing upcoming query executed successfully against production D1.

## 11. Deployment evidence

- Git source commit: `042d3e6c482a1bfff0d5f9460b994be0859f5863`
- Worker: `foxtutor-learn`
- Worker version: `7a9b7b0f-40ca-44b3-9698-2a216708f5bb`
- Deployment timestamp: `2026-09-14T16:46:25.243Z`
- D1 migration state: no migrations to apply; through `0024`
- Scheduler remains `*/5 * * * *`

## 12. Observability

Student billing now emits structured `student_billing_stage` entries for
authentication resolution, student lookup, London date resolution, each data
query, totals, rendering and route completion. Query failures emit
`student_billing_stage_failed` with the stage, entity IDs, exception name and
truncated message before rethrowing. This preserves programming failures while
making the next failure diagnosable.

## 13. Other defects discovered

The production-only D1 compound-select limit was not represented by the
previous local test seam. The regression now explicitly models that failure.

## 14. Other defects not fixed

Authenticated runtime acceptance, a populated invoice/payment state, provider
financial acceptance, GoCardless lifecycle evidence and commercial approval
gates remain open. No provider acceptance is inferred from the route fix.

## 15. Provider acceptance

This phase does not claim FreeAgent invoice creation, credit-note behavior,
Direct Debit collection, payment settlement or production financial readiness.

## 16. Human actions required

- Open `/learn/student/billing` with a legitimate authenticated student session
  and record status, content, Ray ID and the stage logs.
- Repeat with an empty-billing student state and a populated invoice/payment
  state once an approved non-mutating or Sandbox fixture is available.

## 17. Git

The deployed source commit is clean and exact at `042d3e6`. Documentation
updates for this report are intentionally separate and must not be mistaken
for a new executable deployment.
