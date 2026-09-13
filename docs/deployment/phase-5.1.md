# Phase 5.1 — Deployment and release record

## Release sequence

1. Preserve the Phase 4 baseline and verify the worktree before changes.
2. Run the automated, browser/static and production perimeter checks.
3. Apply forward-only D1 migrations `0010_phase5_cancellations.sql` and
   `0011_phase5_notification_types.sql`.
4. Deploy the exact pushed commit with `wrangler.jsonc`.
5. Record the Worker version, commit, remote commit and migration state.
6. Run authenticated cancellation, exception, decision, reschedule, calendar,
   notification and authorization acceptance using temporary fixtures.
7. Remove all controlled fixtures and re-check the production state.

## Release boundary

Phase 5 stores billing-consequence classifications but does not call FreeAgent,
create invoices, create credits or process payments. Those operations remain
Phase 6 work.

## Deployment record

The final production Worker version, deployment timestamp, commit and
authenticated acceptance evidence are recorded here when the release is
deployed. A release must not be tagged `phase-5-complete` until the
authenticated acceptance and fixture cleanup gates have passed.
