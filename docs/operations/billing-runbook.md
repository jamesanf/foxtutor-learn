# Billing operations runbook

## Daily checks

Open `/learn/admin/billing`. Review `Needs attention`, failed payments,
mandate-pending lessons and reconciliation-required items before lessons begin.
Use invoice detail to inspect provider references and credit detail to explain
the ledger balance. Use the **Audit** link beside a billing row to open the
read-only chain check for a student. It refreshes the verified FreeAgent
contact mapping before reporting the local mandate, invoice, payment and alert
state.

At approximately 03:00 Europe/London the existing Worker scheduler runs the
bounded billing sentinel once for the London business date. Review open
sentinel diagnostics if the billing dashboard or logs report a
`BILLING_SENTINEL_*` code. Sentinel checks are read-only against financial
state; they must never be "fixed" by creating a test invoice or payment.

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
does not create a parallel mandate. The student billing page presents
Direct Debit as the normal billing rail and maps the customer-level state to
plain English: setup required, authorisation pending, active, failed/inactive,
or status unavailable.
It never displays provider IDs or bank details.

FreeAgent's public API does not support creating the mandate request or
authorisation link. The administrator performs the one-time setup initiation
in FreeAgent; the customer then opens the secure provider request and enters
bank details there, not in FoxTutor Learn. A missing or expired request is
handled through `billing@foxtutor.org`. Setup and pending notifications are
idempotent and cooldown-controlled; they stop once the mandate is active.

### Emergency billing exception

PAYG is not a student-facing option. For an exceptional last-minute lesson
only, an administrator may open the billing dashboard's **Emergency
exception** action before an invoice exists, enter a reason of at least ten
characters, and submit it. FoxTutor records the actor, reason and billing
event in an immutable audit row and excludes that event from automatic Direct
Debit initiation. Never expose the action to a student, accept a student
request for it, or mark a payment as confirmed without provider evidence.

A submitted or pending collection is not `PAYMENT_SECURED`; only full credit
coverage or confirmed provider payment is secure.

### Billing-chain audit outcomes

* `HEALTHY`: the verified mapping and current billing state have no unresolved
  exception.
* `WARNING`: provider work is scheduled, submitted or pending, but no payment
  is yet secured.
* `ACTION_REQUIRED`: mandate setup, authorisation, failure, inactivity or an
  open operational alert needs attention.
* `UNKNOWN`: FreeAgent could not be read safely or the provider returned an
  unexpected state.
* `BROKEN`: the local billing account and verified FreeAgent contact mapping
  disagree.

The audit is read-only with respect to invoices and payments. It must not be
used as a reason to retry an ambiguous Direct Debit mutation.

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

## FreeAgent environment and category operations

Use the configured server-side `FREEAGENT_ENVIRONMENT`; never construct or
accept a Production/Sandbox choice from an unvalidated client-only parameter.
Sandbox uses `https://api.sandbox.freeagent.com` and Production uses
`https://api.freeagent.com` for API calls, OAuth approval and token exchange.
The OAuth callback must match the persisted environment-bound state.

The category selector consumes the four FreeAgent collections
`admin_expenses_categories`, `cost_of_sales_categories`, `income_categories`
and `general_categories`. Display `description` and `nominal_code`; treat
provider URLs as identifiers only. A category may be saved only when it was
returned for the connected company and its URL matches the active environment.
If categories fail to load, preserve the provider/status diagnostic and do not
silently substitute an empty or guessed category.
