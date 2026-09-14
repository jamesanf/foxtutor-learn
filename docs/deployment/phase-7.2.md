# Phase 7.2 deployment record

## Runtime

- Worker: `foxtutor-learn`
- Executable source commit: `9da2c03`
- Worker version: `bba7fcaf-dfa6-42dd-aa77-11ac66e04125`
- Repository HEAD after deployment documentation: `bce3952`
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
