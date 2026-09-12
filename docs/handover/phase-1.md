# HUMAN HANDOVER REQUIRED

## Phase 1.4 status

The production activation preflight was repeated on 2026-09-12 using the
credential exposed through `CLOUDFLARE_API_TOKEN`. It authenticated to the
intended Foxlearningltd account and `foxtutor.org` zone, but Access application
and identity-provider write probes still returned HTTP 403 (`auth.forbidden`,
error 1010). D1, Workers Routes, R2 and user membership/details permissions
also remain unavailable through that token.

Production mutation was correctly stopped. See
`docs/evidence/phase-1/phase-1.4-credential-check.txt`.

## Phase 1.3 status

**Status:** genuine human blocker. Production remains unchanged and Phase 1 is not complete.

Phase 1.3 exhausted the Cloudflare mechanisms exposed to the runtime:

1. `CLOUDFLARE_API_TOKEN` is active and is the credential used by Wrangler whenever the variable is set. It can read the account, zone, Workers and Access collections, but D1, Workers Routes, R2 and Worker deployment requests are permission-blocked.
2. The existing Wrangler OAuth session in `~/Library/Preferences/.wrangler/config/default.toml` is usable when `CLOUDFLARE_API_TOKEN` is unset. `npx wrangler whoami` identifies `foxlearningltd@gmail.com` and reports `workers_scripts:write`, `workers_routes:write` and `d1:write` among its scopes. Direct API reads and non-mutating invalid-payload validations confirmed those capabilities.
3. No `.github` CI configuration, project credential file or second Cloudflare environment variable is available. Wrangler logs/configuration contain no additional usable credential path.

No token values, refresh tokens, cookies or private response bodies are recorded in the repository.

## Exact missing capability

Zero Trust Access write control-plane access for the Foxlearning account:

- Access application create/edit;
- Access identity-provider create/edit;
- Access policy create/edit.

The missing capability is required to configure the private `foxtutor.org/learn` perimeter and Google identity. D1, Worker deployment and Workers Routes capability already exists through the OAuth mechanism. R2 is not required for Phase 1.

## Exact operations and results

Using the OAuth mechanism:

- `POST /accounts/aeab9f48fa9716273d02bfb3d530bddc/access/apps` with `{}`: HTTP 403, `auth.forbidden`, error `1010`.
- `POST /accounts/aeab9f48fa9716273d02bfb3d530bddc/access/identity_providers` with `{}`: HTTP 403, `auth.forbidden`, error `1010`.
- Access application, identity-provider and policy reads: HTTP 200, empty collections.

Using `CLOUDFLARE_API_TOKEN`, the same Access reads return HTTP 200 with empty collections and Access application write returns HTTP 403, `auth.forbidden`, error `1010`. The full capability matrix is in `docs/evidence/phase-1/cloudflare-capability-check.txt`.

## Existing alternatives tested

- Existing Wrangler OAuth session: sufficient for Worker scripts, D1, Workers Routes and R2 reads; insufficient for Access writes.
- `CLOUDFLARE_API_TOKEN`: insufficient for D1, Worker deployment, Workers Routes, R2 and Access writes.
- Local Wrangler state, environment variable names, project configuration, repository scripts and CI tree: no additional usable Cloudflare mechanism.
- Existing Access application, Google identity provider and Access policy: none exists according to the OAuth-backed read inventory.

## Exact human action required

Make an **existing** Cloudflare credential or authenticated mechanism with Access application, identity-provider and policy write permissions available to this runtime, preferably through a documented environment/profile path without placing secrets in source control. If no such existing credential exists, create only the minimum account-scoped credential required for those three Access write capabilities; do not create a replacement for the already-capable Wrangler OAuth mechanism.

After that capability is available, Phase 1.4 can proceed with read-before-write activation: create the `foxtutor-learn` D1 database only if still absent, apply the migration, configure Google/Access only for `/learn` and `/learn/*`, deploy the Worker, create the exact routes, and run the authenticated/browser/public regression gates. Do not create `phase-1-complete` until all required production evidence exists.

No public-site change, DNS change, production Worker deployment, D1 creation, route creation, Access mutation or production mail send was performed in Phase 1.3.

## Phase 1.5 remaining handover

Learn-scoped production infrastructure is now deployed. The remaining
acceptance work requires:

- clean Chromium authentication with the controlled admin identity;
- clean Chromium authentication with the controlled student identity;
- an authenticated unknown-identity denial check;
- a student-to-admin denial check;
- a controlled Fox Mail `INTERNAL_API_TOKEN` and destination for one
  production delivery plus duplicate idempotency verification.

The production D1 currently contains only `foxlearningltd@gmail.com` as the
controlled admin and `student.test@foxtutor.org` as the controlled student
placeholder. No real student data was added. The completion tag must not be
created until the remaining browser and mail evidence is captured.
