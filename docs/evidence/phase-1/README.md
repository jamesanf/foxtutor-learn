# Phase 1 evidence index

The public baseline files in this directory were captured before any Learn deployment on 2026-09-12. They contain response headers and bodies for the homepage, robots, sitemap and representative asset URLs. The same three public resources were rechecked during Phase 1.2 and Phase 1.3 and retained the same body hashes.

Phase 1.3 capability reconciliation established that the runtime has two existing Cloudflare mechanisms:

- `CLOUDFLARE_API_TOKEN`: active account/zone/Worker/Access-read path, but insufficient for D1, Worker deployment, Routes and R2.
- Existing Wrangler OAuth session: account/zone/Worker/D1/Routes/R2-read path with relevant Worker, D1 and Routes write scopes; Access writes remain forbidden.

The OAuth-backed inventory is four Workers without `foxtutor-learn`, two unrelated D1 databases without `foxtutor-learn`, zero Workers Routes, two R2 buckets, and empty Access application, identity-provider and policy collections. No production mutation was made. The exact matrix, endpoints and sanitized responses are in `cloudflare-capability-check.txt`.

Post-deployment evidence must add:

Phase 1.2 and Phase 1.3 add capability and local-runtime evidence in `cloudflare-capability-check.txt` and `local-validation.txt`. The following production evidence is intentionally absent because the required Access write control-plane permission is unavailable:

- Cloudflare Worker production version/route;
- D1 database ID and remote migration result;
- Access application/policy identifiers;
- authenticated browser result summary;
- production noindex header/meta result;
- real controlled mail send output.

`production-inactive.txt` records the live pre-activation result: the public application still serves `/learn` and related paths because no Learn route or Access policy exists yet. A real Chrome headless capture of `/learn` had the public Fox Tutor title and body hash `1b2d8bf63d44b99a9986db537e491a981539426f0294be6ffc1a99e0eff5237b`.

Do not store tokens, cookies, OAuth assertions, private pupil data or authenticated browser profiles.

Phase 1.4 credential verification:

- `phase-1.4-credential-check.txt` records the safe pre-mutation probes from
  2026-09-12. The exposed API token authenticated to the intended account and
  zone but still failed the required Access application and identity-provider
  write boundary, so production activation was correctly stopped.

The Phase 1.4 runtime recheck on 2026-09-12 confirmed that the intended
Access-write-capable credential is still not exposed to the Learn terminal.
The exact capability results and the unmodified public-site/pre-activation
state are recorded in `phase-1.4-credential-check.txt`. No production
mutation was attempted after the failure.

The subsequent recheck again identified `CLOUDFLARE_API_TOKEN` as a User API
Token rather than the expected account-token format. The local suite passed
with 12 tests after malformed cookie parsing was hardened, and live public
homepage, robots and sitemap hashes still match the baseline. Production
activation remains blocked by the missing Access write capability.

## Phase 1.5 production activation

The dedicated Learn credential was subsequently exposed and verified. The
production activation evidence is recorded in
`phase-1.5-production-activation.txt`. It includes the Worker version, D1 UUID
and migration result, exact route inventory, isolated Access app/policy and
public-site regression hashes. No public-site Worker, route, DNS, robots,
sitemap or asset was modified.

Authenticated admin/student/unknown Chromium flows and controlled Fox Mail
delivery remain unproven because this runtime has no controlled Google student
credentials or Fox Mail internal API secret. Do not mark Phase 1 complete or
create the completion tag until those tests pass.

## Phase 1.6 acceptance preflight

The 2026-09-12 preflight inspected the live resources without recreating them
and changed only the production D1 student email with a guarded update:

- `foxlearningltd@gmail.com` — `ADMIN`, `ACTIVE`
- `jamesanf@gmail.com` — `STUDENT`, `ACTIVE`

The Learn Access policy still requires reconciliation from the temporary
`student.test@foxtutor.org` entry because the runtime token cannot perform
Access writes. The temporary identity is no longer active in D1.

Fox Mail source confirms that production machine sends require its
`INTERNAL_API_TOKEN` plus a non-interactive Access Service Auth path. Fox
Mail's current production secret inventory does not contain
`INTERNAL_API_TOKEN`; the live internal endpoint returns the interactive
Access login boundary without machine credentials. No send or idempotency
claim was made.

PASS evidence captured in this pass:

- `npm test`
- `npm run build`
- `npm run check`
- `npm run test:browser`
- `npm run test:production`
- production D1 final user query
- public `/`, `/robots.txt`, `/sitemap.xml` and `/about` status/content-type/hash regression

Required evidence still missing:

- controlled Fox Mail delivery and exact-key idempotency replay;
- clean tree, pushed acceptance commit and `phase-1-complete` tag.

## Phase 1.6 acceptance recheck

The final Learn Access policy now contains only:

- `foxlearningltd@gmail.com`
- `jamesanf@gmail.com`

Production D1 contains exactly those two active users with roles `ADMIN` and
`STUDENT`. Exact route inventory remains `foxtutor.org/learn` and
`foxtutor.org/learn/*`, both targeting `foxtutor-learn`.

Authenticated browser evidence:

- admin profile: `/learn/admin` rendered `Admin dashboard`;
- student profile: `/learn/student` rendered `Student dashboard`;
- student direct request to `/learn/admin`: `Not authorized` application denial;
- unknown controlled identity: denied by the final Cloudflare Access perimeter;
- authenticated admin response: HTTP 200, `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`;
- authenticated admin HTML: robots meta `noindex,nofollow,noarchive,nosnippet`;
- authenticated admin refresh: session remained at `/learn/admin`;
- session cookie metadata: Secure, HttpOnly, SameSite=Strict; no authentication
  token was present in localStorage.

Automated and regression evidence:

- `npm test` — 12 tests passed;
- `npm run build` — passed;
- `npm run check` — passed;
- `npm run test:browser` — passed;
- `npm run test:production` — passed;
- public `/`, `/robots.txt`, `/sitemap.xml` and `/about` returned expected
  statuses/content types; homepage, robots and sitemap hashes match the
  stored baseline;
- `/learn` with a Googlebot user agent returned the Cloudflare Access login
  boundary and the public sitemap contains no Learn URL.

Fox Mail remains blocked at the production boundary. The authoritative
endpoint is `https://mail.foxtutor.org/internal/api/v1/messages/send`; source
requires `INTERNAL_API_TOKEN` plus a non-interactive Access Service Auth path,
but the Fox Mail production secret inventory does not contain that token and
an unauthenticated request returns HTTP 302 to the interactive Access login.
No delivery or idempotency result was claimed.
