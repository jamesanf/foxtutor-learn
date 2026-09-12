# Phase 1 deployment

## Environments

| Environment | Worker access | Database | Mail |
|---|---|---|---|
| local | Wrangler dev, test identity header only | local D1 binding | mock adapter unless explicitly configured |
| staging/test | separate Worker/Access policy if created | separate D1 | test mail secret and admin-only recipient |
| production | `foxtutor.org/learn*` behind Access | production `foxtutor-learn` D1 | secret-managed Fox Mail token |

`wrangler.local.jsonc` defines the isolated local D1 binding. Never point local tests at production D1 or production mail.

## Required production sequence

1. Create a new D1 database named `foxtutor-learn` and apply `migrations/0001_foundation.sql`.
2. Provision the initial admin and a test student with normalized emails; do not commit those addresses if private.
3. Deploy `foxtutor-learn` with the checked-in Wrangler configuration.
4. Add a Cloudflare Access self-hosted application for `foxtutor.org/learn` and `foxtutor.org/learn/*`, using Google identity and an allow policy for the intended test identities.
5. Confirm the public site has no Access policy or route change.
6. Set the production `MAIL_API_TOKEN` as a Worker secret only if the Fox Mail contract is approved.
7. Run `npm run test:production` and the authenticated Chromium matrix.
8. Record deployment version, D1 ID, Access application ID, route result and public regression evidence under `docs/evidence/phase-1/`.

The current token cannot perform steps 1, 4 or the route inspection. Do not substitute an existing Fox Mail D1 database or route.
