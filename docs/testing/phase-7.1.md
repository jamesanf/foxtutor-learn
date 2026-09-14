# Phase 7.1 testing and evidence

## Automated results

- `npm test`: 31 test files, 168 tests passing.
- `npm run check`: legal sync, TypeScript build, client bundle and Wrangler
  deployment dry-run passing.
- Local D1 migrations through `0023_credit_ledger_reversal_view.sql` apply
  successfully and expose the Phase 7.1 tables and credit-balance view.

Coverage includes recurrence windows, end dates, pauses, timezone/DST
conversion, payment readiness, migration contracts, cancellation/reschedule
accounting seams and existing Phase 6 provider behavior.

## Evidence boundary

The automated suite is provider-independent or controlled-seam evidence. It is
not FreeAgent Sandbox or GoCardless Sandbox acceptance. No remote migration,
Worker deployment or financial provider mutation was performed in this phase.

The remaining provider acceptance matrix is documented in the Phase 7.1
handover and acceptance report.
