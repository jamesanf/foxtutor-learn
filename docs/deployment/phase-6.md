# Phase 6 - Deployment record and handoff

## Production runtime

- Worker: `foxtutor-learn`
- Routes: `foxtutor.org/learn` and `foxtutor.org/learn/*`
- Schedule: `*/5 * * * *`
- D1: `foxtutor-learn`
- D1 migration state: through `0020_accounting_company_name.sql`; no pending
  migrations
- R2: `foxtutor-learn-resources`
- Repository state: documentation-only reconciliation commits may follow the
  executable deployment
- Deployed source commit: `4afa705`
- Deployed Worker version: `71accc39-6c06-4fc7-9390-12afcf48add1`
- FreeAgent Sandbox secret bindings: configured
- FreeAgent OAuth connection: completed for Fox Learning Ltd Sandbox;
  encrypted tokens are persisted in `accounting_connections`
- Live Sandbox D1 verification: one `VERIFIED` contact mapping for `257175`
  with no conflict; no outbox, retry-audit or financial-mutation rows
- Live billing configuration: no persisted row because the approved
  FreeAgent category/accounting mapping has not been supplied

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

The latest executable release also includes the corrected
`external_accounting_links` insert (15 values for 15 columns), successful D1
mapping-path regression coverage, compact contact save/remove controls, and
matching accounting settings/back icons.

The current repository HEAD is `3921c60`; it is distinct from the deployed
executable source commit above. The current full validation result is 27 test
files and 143 tests passing, with build/check, browser shell and production
perimeter smoke passing. The visual calendar helper was attempted with a local
Chrome and Worker, but the isolated local D1 had no calendar fixture events;
the Phase 6 browser shell contract remains passing.
