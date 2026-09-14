# Phase 7.2 deployment record

> This is the detailed deployment record for the Phase 7 baseline. The
> consolidated status is `docs/phase-7.md`; deployment does not by itself
> establish authenticated route or provider acceptance. The student billing
> route has a reported post-deployment Worker 1101 that remains open.

## Runtime

- Worker: `foxtutor-learn`
- Executable source commit: `9da2c03`
- Worker version: `bba7fcaf-dfa6-42dd-aa77-11ac66e04125`
- Repository HEAD at deployment record: `bce3952`; later documentation-only
  updates remain in the pushed `main` history.
- Routes: `foxtutor.org/learn`, `foxtutor.org/learn/*`
- Scheduler: `*/5 * * * *`
- Access perimeter: verified by protected-route smoke test returning the
  Cloudflare Access login challenge.

## Database

Production D1 `foxtutor-learn` applied migrations `0021` through `0024` on
2026-09-14. The remote schema contains billing events, reconciliation tasks,
alert audit and Europe/London timezone guards. Existing remote data remains
four lessons, two students, one connected accounting record and one verified
Sandbox contact mapping; billing events remain zero.

## Safety boundary

The release did not create a recurring series, invoice, credit note, payment,
mandate or other financial mutation. Real provider acceptance remains blocked
until approved commercial settings and human Sandbox evidence are available.
