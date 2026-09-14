# Phase 7.1 deployment record

## Current state

This is the historical Phase 7.1 record. Its local-only boundary was
superseded by Phase 7.2, which applied migrations through `0024` and deployed
the completed runtime. See `docs/deployment/phase-7.2.md` for the current
record.

`npm run check` passes with a Wrangler dry-run. No `--remote` migration,
production deployment or financial mutation was performed.

## Required release order

1. Resolve Phase 6 commercial/accounting approvals and provider Sandbox gates.
2. Review the forward-only migrations and backup/rollback posture.
3. Apply migrations remotely.
4. Verify remote schema and migration history.
5. Deploy the Worker.
6. Run non-financial smoke checks.
7. Perform controlled Sandbox acceptance with evidence classified by provider.

Do not run a live financial mutation merely to demonstrate deployment.
