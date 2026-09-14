# Phase 7.2 architecture

```text
Europe/London recurring series
  -> six-week materialised lesson
  -> deterministic billing event
  -> immutable credit ledger
  -> individual FreeAgent invoice
  -> FreeAgent-GoCardless collection state
  -> deterministic payment readiness
  -> alerts and reconciliation tasks
```

The application stores provider references and provider status separately from
FoxTutor business state. A provider timeout is never treated as a successful
financial result. A local credit reversal is a compensating ledger transaction,
not an edit to historical credit.

The `billing_alerts` and `billing_reconciliation_tasks` tables are operational
projections with deterministic deduplication keys. `billing_alert_events`
records actor actions so an administrator can explain when an exception was
acknowledged or resolved.

The series controls change only future recurrence. Historical and overridden
lesson instances are not rewritten. Cancellation after invoicing marks the
local billing path as requiring provider reconciliation and leaves provider
documents untouched unless a documented provider operation is available.
