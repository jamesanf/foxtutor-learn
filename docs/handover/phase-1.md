# HUMAN HANDOVER REQUIRED

Phase 1.1 is blocked before production activation. The safe repository implementation and local validation are complete; the current Cloudflare API token lacks the permissions required to create or inspect the production control-plane resources.

## 1. What is blocked

- Production D1 database creation and migration.
- Cloudflare Access application and Google identity policy for `/learn`.
- Narrow Workers Route `foxtutor.org/learn*` creation/verification.
- Post-deployment authenticated browser and public-site regression evidence.

## 2. Why it is blocked

Cloudflare API calls for D1, Workers Routes, Zero Trust Access, R2 and Pages return authentication error `10000`. Worker version inspection and dry-run are available, but those permissions are insufficient to prove a safe live route.

The safe implementation is pushed as commit `a169edd` with checkpoint tag `phase-1.1-blocked`.

## 3. Exact action required

Using a Cloudflare token/account with the required account/zone permissions:

```sh
cd /Users/james/Documents/FoxTutorWebsite/learn
npx wrangler d1 create foxtutor-learn --use-remote --update-config
npx wrangler d1 migrations apply foxtutor-learn --remote
npx wrangler deploy --message "Phase 1 private Learn foundation"
```

Then create a Zero Trust Access self-hosted application for both `https://foxtutor.org/learn` and `https://foxtutor.org/learn/*`, enable Google authentication, and allow only the intended admin/student test identities. Do not change the public-site application, DNS, public Worker, Pages project or existing routes.

Provision users with the migration schema and set `MAIL_API_TOKEN` only through Wrangler secret management after the Fox Mail endpoint contract is confirmed.

## 4. Expected result

Unauthenticated `/learn` requests receive Access challenge/denial; provisioned admin/student identities reach only their role shell; unknown identities receive the application denial; Learn responses have noindex headers/meta; `/` and public assets remain unchanged.

## 5. How to verify

Run:

```sh
npm test
npm run build
npm run check
npm run test:browser
npm run test:production
```

Then run the authenticated Chromium matrix described in `docs/testing/phase-1.md`, capture deployment/access/D1 identifiers and append the results to `docs/evidence/phase-1/`.

## 6. What the next agent can continue

The next agent should read this file, inspect `wrangler.jsonc` for the generated D1 binding, apply the production migration, verify Access and the route without touching public paths, run the browser/public regression suite, update the evidence and changelog, then create the final Phase 1 commit/tag only if every exit criterion passes.
