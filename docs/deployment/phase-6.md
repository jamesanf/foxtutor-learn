# Phase 6 - Deployment record and handoff

## Production runtime

- Worker: `foxtutor-learn`
- Routes: `foxtutor.org/learn` and `foxtutor.org/learn/*`
- Schedule: `*/5 * * * *`
- D1: `foxtutor-learn`
- D1 migration state: through `0017_accounting_operations.sql`; no pending
  migrations
- R2: `foxtutor-learn-resources`
- Production FreeAgent configuration: absent until human acceptance

The deployed source commit and Worker version are recorded separately in the
latest release entry. A documentation-only commit does not constitute a
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
