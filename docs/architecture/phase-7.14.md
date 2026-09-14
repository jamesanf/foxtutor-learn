# Phase 7.14 architecture

## Environment-bound contact verification

The administrator contact-mapping form is Production-only. It always writes
to the `production` environment and therefore cannot send a Production contact
ID through the legacy server-default Sandbox pipeline. The selected backend
environment determines:

```text
connection row
→ encrypted token and refresh path
→ FreeAgent API origin
→ company-bound mapping row
→ error status and persistence
```

The stored contact URL must have the canonical origin for that environment.
The same environment-bound token is used for the contact request, so the
provider company identity is inherited from the independently verified
connection. Sandbox and Production references remain separate rows and may
legitimately differ.

Sandbox contact configuration is hidden behind the Production billing-settings
page as a testing-only area. For the approved Sandbox test payer
`jamesanf@gmail.com`, the backend uses contact reference `257175`; this
fallback is never used by Production contact mapping.

The provider's `direct_debit_mandate_state` is read and normalized only for
safe diagnostics. Contact verification never changes the provider contact or
mandate.

## Recurring-series response safety

Interactive create and resume operations materialise only their target series.
The scheduler continues to materialise all active series independently.

Lesson instances use the deployed partial unique index:

```sql
CREATE UNIQUE INDEX idx_lessons_series_occurrence
  ON lessons(recurring_series_id, recurrence_key)
  WHERE recurring_series_id IS NOT NULL AND recurrence_key IS NOT NULL;
```

The corresponding UPSERT includes the same predicate in its conflict target.
This preserves idempotent lesson and billing-event generation without requiring
a schema change.

Pause, resume and create remain replay-safe through existing status guards,
pause uniqueness and billing idempotency keys. A provider or database failure
is not converted into a success-shaped response.

## Compatibility boundary

The temporary `FREEAGENT_TEMP_PRODUCTION_REUSE_LEGACY_APP=true` arrangement is
retained until authenticated Production contact and recurring acceptance proves
that the shared credential resolution is safe. Removing secrets or the flag
before that evidence would be unsafe.
