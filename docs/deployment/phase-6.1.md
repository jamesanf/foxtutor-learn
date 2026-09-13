# Phase 6.1 — Deployment record

## Release boundary

The code adds a separate accounting outbox, OAuth connection storage, the
FreeAgent adapter, Worker processing, admin monitoring/retry/reconciliation
routes and same-transaction Phase 5 event creation. It does not process
payments or direct debits.

## Current state

- Local build, type-check and existing tests pass.
- Migration `0016_accounting_outbox.sql` is forward-only and has not been
  enabled with live FreeAgent credentials.
- No FreeAgent secret or token is committed.
- Sandbox and production acceptance are pending.
- `phase-6-complete` must not be tagged until the external acceptance matrix
  in `docs/testing/phase-6.1.md` is evidenced.

## Rollout order

1. Apply migration `0016_accounting_outbox.sql`.
2. Deploy the exact reviewed commit with no provider secrets initially.
3. Configure and verify FreeAgent sandbox OAuth and company identity.
4. Configure payer/contact and accounting mappings supplied by the business.
5. Run sandbox acceptance and inspect external references.
6. Configure production secrets only after sandbox evidence is complete.
7. Run one controlled production acceptance event and retain its evidence.
