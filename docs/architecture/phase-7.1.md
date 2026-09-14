# Phase 7.1 architecture

## Authority and flow

```text
recurring_lesson_series
  -> bounded lesson instances
  -> one deterministic billing_event per billable lesson
  -> customer credit allocation
  -> one billing_invoice / provider operation
  -> FreeAgent invoice and exposed payment state
```

FoxTutor is authoritative for recurrence, pauses, reschedules, cancellations,
lesson entitlement, billing events, credit and readiness. FreeAgent is
authoritative for accounting documents, provider references, document status,
mandate state and payment state exposed by its API. No direct GoCardless
mandate is created.

## Recurrence

Series are weekly and bounded. FoxTutor business time is always
`Europe/London`; the scheduler materialises only the inclusive window from
London today through London today plus six weeks.
Unique `(series_id, recurrence_key)` storage and deterministic local dates make
replays and overlapping workers safe. Historical and overridden instances are
not rewritten by later series revisions. Pause intervals suppress instances
without destroying the series.

Cancellation supports one instance or the selected instance and future
series segment. Records are retained; future billing is suppressed. A
reschedule marks a recurring instance as overridden and updates its pending
billing dates without creating a second billing event.

## Billing and credit

Each lesson event stores lesson, payer, amount, billing date, due date,
collection date, status and idempotency identity. Credits are immutable
ledger transactions. Oldest available credits are allocated deterministically.
The full-credit path is local `CREDIT_COVERED`; it does not create a
zero-value FreeAgent invoice or collection.

Provider failures use a compensating `REVERSAL` transaction. Unknown provider
outcomes retain the allocation and create reconciliation work. No fake payment
or bank transaction is used to match a FreeAgent credit note.

## Payment readiness

`collection_date = lesson_date - 7 calendar days`. Readiness distinguishes
not-yet-due, mandate pending, scheduled, pending, confirmed, failed, unknown
and reconciliation-required states. A submitted or pending Direct Debit is not
treated as secured attendance payment.

## Alerts and reconciliation

Billing operations use deterministic idempotency keys and atomic claims.
Failures, timeouts, inactive mandates, unknown states and insecure upcoming
lessons produce deduplicated, actionable alerts. Provider references and local
states remain available for later reconciliation.
