# Phase 7.1 deployment record

## Current state

Phase 7.1 is implemented and validated locally only. Local D1 migrations
`0021`, `0022` and `0023` apply successfully. The production/remote D1 schema
and Worker remain at the Phase 6 deployment boundary.

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
