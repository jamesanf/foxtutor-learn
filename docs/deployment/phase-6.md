# Phase 6 - Deployment record and handoff

## Production runtime

- Worker: `foxtutor-learn`
- Routes: `foxtutor.org/learn` and `foxtutor.org/learn/*`
- Schedule: `*/5 * * * *`
- D1: `foxtutor-learn`
- D1 migration state: through `0020_accounting_company_name.sql`; no pending
  migrations
- R2: `foxtutor-learn-resources`
- Repository HEAD at executable deployment: `13af4f7`
- Deployed source commit: `13af4f7`
- Deployed Worker version: `890be944-debd-462f-8fb5-8160b4910fa6`
- FreeAgent Sandbox secret bindings: configured
- FreeAgent OAuth connection: completed for Fox Learning Ltd Sandbox;
  encrypted tokens are persisted in `accounting_connections`

Wrangler reported the deployment source metadata as `Unknown`; the deployed
source commit above is the reviewed executable commit from which
`npm run deploy` was run.

## Safe rollout order

1. Confirm the reviewed executable commit and clean diff.
2. Apply forward-only D1 migrations before code that requires them.
3. Deploy without provider secrets if the provider gate is still closed.
4. Verify Worker version, deployed source commit, routes and D1 migration
   state.
5. Run perimeter smoke and authenticated admin/student checks where credentials
   are available.
6. Confirm the configured Sandbox secrets, company pin and callback, then
   review the active connection identity and initial 55.00 GBP settings in the
   admin billing-management page.
   GBP cannot be changed; any other setting change must be explicit and
   approved. The current non-VAT setting is an explicit zero tax rate; never
   rely on FreeAgent defaults.
7. Complete or reauthenticate through the sandbox OAuth callback. The exact
   callback path bypasses Cloudflare Access, but the Worker accepts it only
   with the one-time admin-bound OAuth state and creates the normal Learn
   session after success. Production paths pass an explicitly bound
   `globalThis.fetch` wrapper to the FreeAgent adapter.
8. Complete the sandbox acceptance runbook.
9. Configure production only after sandbox evidence and commercial approval.
10. Run exactly one approved controlled production accounting event.
11. Verify the external provider object, retention and independent evidence.

## Current closure state

The application-side release is technically complete. The current phase is
not operationally closed because the `ADMIN_CANCELLED` consequence remains
undecided and sandbox/production provider acceptance have not occurred. Do
not create `phase-6-complete` before those steps pass.
