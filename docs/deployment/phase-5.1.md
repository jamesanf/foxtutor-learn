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

- Production commit: `08e9ae3`
- Remote `main`: `08e9ae3`
- Worker version: `31a62fb3-7c88-4bb8-a073-9cc06d34e1d7`
- Deployment timestamp: `2026-09-13T17:39:12.016Z`
- Production D1: migrations `0010` and `0011` applied; no migrations pending
- Production Phase 5 table counts after deployment: zero cancellation requests,
  zero lesson history rows, seven existing notifications
- Public perimeter smoke: passed; Learn remains Access-protected and absent
  from the public sitemap
- Browser/static shell contract: passed

Authenticated cancellation, exception, reschedule and real Fox Mail acceptance
could not be completed from this environment because no Cloudflare Access
authenticated test session or service token is available. The release is
deployed, but `phase-5-complete` is intentionally not tagged until that
acceptance and controlled-fixture cleanup are performed.
