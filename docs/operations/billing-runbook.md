# Billing operations runbook

## Daily checks

Open `/learn/admin/billing`. Review `Needs attention`, failed payments,
mandate-pending lessons and reconciliation-required items before lessons begin.
Use invoice detail to inspect provider references and credit detail to explain
the ledger balance.

## Unknown provider result

Do not retry blindly. Confirm the provider document by the stored reference,
allow the scheduled reconciliation worker to refresh status, and resolve the
alert only after local and provider state agree.

## Cancellation after invoice

FoxTutor preserves the invoice and creates a local credit. If provider
matching is unsupported, leave the reconciliation-required operation open and
complete the documented provider-side action. Never create a dummy payment or
bank transaction.

## Direct Debit

Mandates are managed by the existing FreeAgent-GoCardless workflow. FoxTutor
does not create a parallel mandate. A submitted or pending collection is not
`PAYMENT_SECURED`; only full credit coverage or confirmed provider payment is
secure.

## Recovery

The scheduler is safe to rerun after downtime. Operations are claimed
atomically, deterministic keys prevent duplicates, and stale processing claims
become unknown/reconciliation work. Investigate D1 contention or repeated
provider failures before changing configuration.

## Student Billing Worker 1101 Diagnostic Procedure

1. Reproduce the authenticated `GET /learn/student/billing` request and record
   the timestamp and Ray ID. An Access challenge is not route acceptance.
2. Tail `foxtutor-learn` with Wrangler, filtered to the failing version or
   request where possible. Correlate `student_billing_stage` entries with the
   Ray ID; the permanent stages identify the last successful operation without
   logging cookies, tokens or complete payment data.
3. Classify the failure as authentication, student mapping, date handling,
   credit query, history query, upcoming query, totals/conversion or rendering.
   Preserve the exception name/message and D1/provider code in the operator
   record.
4. Execute the affected SQL directly against the matching remote D1 schema,
   then reproduce it locally with a focused regression test. Do not replace a
   failed query with fabricated empty data or a blanket catch.
5. Fix the root cause, run the focused and full test suites, deploy the exact
   tested source commit, and record the Worker version and migration state.
6. Create a fresh authenticated session and verify status, content type,
   billing headings and both empty and populated data states. Repeat after a
   hard refresh and in a second session.

The Phase 7.4 incident was caused by a six-way `UNION ALL` in
`listBillingHistory`; production D1 rejected it with
`SQLITE_ERROR: too many terms in compound SELECT`. The permanent fix uses
bounded independent queries and deterministic application-side merging.
