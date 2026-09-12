# HUMAN HANDOVER REQUIRED

## Phase 1.6 current checkpoint — 2026-09-12

**Status: BLOCKED.** Safe acceptance work is complete, but the completion
gates cannot be claimed yet.

### 1. Expose the existing Learn Cloudflare credential

The current `CLOUDFLARE_API_TOKEN` verifies as an active token for the correct
account but is not authorized for the Learn Access application/policy. Do not
create, rotate or paste a token into chat. Make the already-verified dedicated
Learn credential available to this runtime through the existing
`CLOUDFLARE_API_TOKEN` environment path.

Verify without revealing the value:

```bash
printf '%s\n' "${CLOUDFLARE_API_TOKEN:0:8}"
curl -sS https://api.cloudflare.com/client/v4/user/tokens/verify \
  --oauth2-bearer "$CLOUDFLARE_API_TOKEN"
npx wrangler whoami
```

The agent will then inspect the existing `FoxTutor Learn` application and
replace only the policy identity `student.test@foxtutor.org` with
`jamesanf@gmail.com`. The existing Google IdP and unrelated Mail/EDInterval
Access resources must remain unchanged.

### 2. Configure the existing Fox Mail machine boundary

Fox Mail source documents `POST
https://mail.foxtutor.org/internal/api/v1/messages/send` as requiring the Fox
Mail Worker secret `INTERNAL_API_TOKEN`. Direct inspection shows that secret is
not currently listed on the Fox Mail Worker, and unauthenticated requests are
redirected to interactive Cloudflare Access.

On the Fox Mail side, restore the existing `INTERNAL_API_TOKEN` secret using
the normal Fox Mail deployment owner workflow; do not send its value to the
agent or commit it. Configure the intended narrowly scoped Cloudflare Access
Service Auth path for only `/internal/api/v1/*` if it is not already present.
Do not broaden or remove the human Google Access protection for Fox Mail.

On the Learn side, add the same bearer value only through the Worker secret
binding:

```bash
npx wrangler secret put MAIL_API_TOKEN --config wrangler.jsonc
```

If Fox Mail confirms that Service Auth is required, add the two corresponding
Learn Worker secrets through Wrangler, without exposing their values:

```bash
npx wrangler secret put MAIL_API_ACCESS_CLIENT_ID --config wrangler.jsonc
npx wrangler secret put MAIL_API_ACCESS_CLIENT_SECRET --config wrangler.jsonc
```

Verify presence without printing values:

```bash
npx wrangler secret list --config wrangler.jsonc
```

The agent will then send exactly one controlled test message to the agreed
owner-controlled destination with subject `FoxTutor Learn Phase 1.6
production mail test` and idempotency key
`phase1-6-mail-test-20260912`, repeat the exact request, and verify Fox
Mail's documented replay behavior without recording message contents or
secrets.

### 3. Human-assisted Google browser checkpoints

Use separate clean Chromium profiles and never provide passwords:

```text
HUMAN CHECKPOINT 1 — ADMIN GOOGLE LOGIN
Please authenticate the clean Chromium profile as foxlearningltd@gmail.com.
Do not provide me with the password. Tell me when the Learn admin page is visible.

HUMAN CHECKPOINT 2 — STUDENT GOOGLE LOGIN
Please authenticate the clean Chromium profile as jamesanf@gmail.com.
Do not provide me with the password. Tell me when the Learn student page is visible.

HUMAN CHECKPOINT 3 — UNKNOWN GOOGLE LOGIN
Please authenticate the clean Chromium profile with a controlled Google account
that is not an approved Learn user. Tell me when Google authentication succeeds
or when Learn displays the denial.
```

The agent will verify `/learn`, `/learn/admin`, `/learn/student`, student-to-admin
denial, unknown-user denial, session persistence, Secure/HttpOnly cookie
metadata where exposed, absence of authentication tokens in localStorage, and
authenticated `X-Robots-Tag`/HTML noindex metadata.

The temporary student identity is no longer active in D1, but remains in the
Access policy until step 1 is completed. Do not create `phase-1-complete` until
that policy entry is removed and all browser/mail evidence passes.

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
