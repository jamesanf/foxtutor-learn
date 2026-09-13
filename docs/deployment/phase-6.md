# Phase 6 - Deployment record and handoff

## Production runtime

- Worker: `foxtutor-learn`
- Routes: `foxtutor.org/learn` and `foxtutor.org/learn/*`
- Schedule: `*/5 * * * *`
- D1: `foxtutor-learn`
- D1 migration state: through `0017_accounting_operations.sql`; no pending
  migrations
- R2: `foxtutor-learn-resources`
- Repository HEAD at executable deployment: `02b75403e2474aec4b693ed86eefa70cc8b8e195`
- Deployed source commit: `02b75403e2474aec4b693ed86eefa70cc8b8e195`
- Deployed Worker version: `cfaa9a46-e64a-4ef0-a672-6a926de205ba`
- Production FreeAgent configuration: absent until human acceptance

Wrangler reported the deployment source metadata as `Unknown`; the deployed
source commit above is the reviewed executable commit from which
`npm run deploy` was run. A documentation-only commit does not constitute a
runtime deployment.

## Safe rollout order

1. Confirm the reviewed executable commit and clean diff.
2. Apply forward-only D1 migrations before code that requires them.
3. Deploy without provider secrets if the provider gate is still closed.
4. Verify Worker version, deployed source commit, routes and D1 migration
   state.
5. Run perimeter smoke and authenticated admin/student checks where credentials
   are available.
6. Configure sandbox secrets through the approved secret store only.
7. Complete the sandbox acceptance runbook.
8. Configure production only after sandbox evidence and commercial approval.
9. Run exactly one approved controlled production accounting event.
10. Verify the external provider object, retention and independent evidence.

## Current closure state

The application-side release is technically complete. The current phase is
not operationally closed because sandbox and production provider acceptance
have not occurred. Do not create `phase-6-complete` before those steps pass.
