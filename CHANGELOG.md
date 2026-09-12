# Changelog

All material changes to the Foxtutor Learn project are recorded here in chronological order. Entries are retained; do not rewrite history.

## Phase 0 — Initial project constitution

### 2026-09-12 — Initial architecture and agent-control baseline

**Status:** planned / documentation baseline

**Purpose:** Establish the first authoritative project constitution before coding begins.

**Decisions recorded:**

- Private application is planned at `foxtutor.org/learn`.
- Student and admin are role areas within one application rather than separate deployments.
- Cloudflare Access + Google identity is the intended V1 authentication perimeter.
- Student accounts are invite-only.
- The lesson is the central domain object.
- Homework/resources are lesson-scoped, not a general-purpose drive.
- R2 is private object storage; D1 stores metadata.
- PDF compression is a required capability for oversized uploads.
- Default lesson-resource retention is at least 12 months.
- Default per-lesson hard storage target is approximately 25 MB, subject to implementation validation.
- `mail.foxtutor.org` is the mail integration boundary.
- FreeAgent/GoCardless are deferred external accounting/payment boundaries.
- Private pages must not be intentionally visible to Google.
- Coding agents must work from repository documentation without conversational context.

**Files introduced by this planning pass:**

- `README.md`
- `AGENT_INSTRUCTION.md`
- `CHANGELOG.md`
- `PHASE_PLAN.md`

**Tests:** documentation review only; implementation test suite not yet established.

**Deployment:** none; Phase 1 is the first production deployment.

**Next step:** create the detailed Phase 0 repository skeleton and foundational configuration.

## Phase 1.1 — Private platform foundation

### 2026-09-12 — Worker, security boundary and production preparation

**Status:** blocked before production activation; safe implementation committed locally

**Implementation:**

- Initialized the authoritative Git checkout for the previously empty `jamesanf/foxtutor-learn` repository.
- Added a Cloudflare Worker + Static Assets application scoped to `foxtutor.org/learn*`.
- Added branded responsive admin/student shell with direct role routes and accessible focus/reduced-motion styles.
- Added Access identity normalization, active-user lookup, explicit `ADMIN`/`STUDENT` authorization, opaque server-side sessions, secure cookies and CSRF validation.
- Added noindex response headers, noindex HTML metadata, CSP, non-cacheable private responses and generic 401/403/404/503 states.
- Added the foundational D1 users/sessions migration.
- Added a narrow server-side `mail.foxtutor.org/api/send` adapter with timeout and mock mode.
- Added unit, integration and security tests plus public-site baseline evidence capture and smoke scripts.
- Updated the project documentation to make `.1` a full-phase pass and `.2+` remediation policy.

**Tests run:** `npm test` (6 files, 10 tests); `npm run build`; `npm run check` (Wrangler dry-run); static browser contract script.

**Deployment:** not performed. The available Cloudflare token can inspect/deploy Worker versions but lacks permissions for D1, Workers Routes, Zero Trust Access, R2 and Pages. No public-site resource was changed.

**Known limitations:** production D1, Access Google policy, `/learn*` route, production secret and authenticated Chromium/post-deployment regression evidence remain pending. See `docs/handover/phase-1.md`.

**Safe implementation commit:** `a169edd`
**Checkpoint tag:** `phase-1.1-blocked`

### 2026-09-12 — Public regression evidence follow-up

Rechecked the public homepage, robots, sitemap, representative content route and CSS/JS assets after local Learn implementation. Statuses and body hashes remained unchanged. No Learn production deployment was made.

## Phase 1.2 — Remediation and capability reconciliation

### 2026-09-12 — Local D1, route safety and mail contract remediation

**Status:** blocked by genuine external Cloudflare control-plane permissions; production remains unactivated

**Implementation:**

- Executed `0001_foundation.sql` against a fresh local Wrangler D1 persistence directory and queried the resulting users/sessions schema and indexes.
- Exercised the local Worker against real local D1 with unauthenticated, admin, student and student-to-admin denial cases.
- Narrowed production routing to exact `foxtutor.org/learn` and `foxtutor.org/learn/*` patterns and moved Learn assets below `/learn/assets/`.
- Preserved production-only `Secure` cookies while allowing local HTTP smoke tests to use the real session flow.
- Aligned the mail adapter with Fox Mail's documented `/internal/api/v1/messages/send` contract, bearer token, idempotency key, explicit `from` identity and optional Access Service Auth headers.
- Rechecked the public homepage, `robots.txt` and sitemap; status, content type and stored body hashes remained unchanged.
- Audited Wrangler and direct Cloudflare REST access. Account, zone, Worker and Access collection reads work; D1, R2, route writes and Access writes remain permission-blocked.

**Tests run:** `npm test`, `npm run build`, `npm run check`, `npm run test:browser`, fresh local D1 migration/schema inspection and local Worker/D1 HTTP smoke requests.

**Deployment:** no production route or Access policy was changed. No production D1 migration, authenticated browser flow or real mail send was claimed.

**Known limitations:** a token with D1 edit, Workers Routes edit and Zero Trust Access edit permissions is required to activate production safely. See `docs/handover/phase-1.md`.

## Phase 1.3 — Capability reconciliation

### 2026-09-12 — Reconcile all available Cloudflare authentication mechanisms

**Status:** genuine human blocker remains for Zero Trust Access writes; production remains unactivated

**Implementation/evidence:**

- Confirmed the environment exposes one active `CLOUDFLARE_API_TOKEN`; Wrangler uses it when present, and its token metadata listing is not accessible.
- Discovered and tested the existing local Wrangler OAuth session without changing production state. `npx wrangler whoami` reports the Foxlearningltd account and relevant `workers_scripts:write`, `workers_routes:write` and `d1:write` scopes.
- Confirmed the OAuth mechanism can read the account, zone, Workers, D1, Workers Routes and R2; non-mutating invalid-payload validations authorize Worker deployment, D1 create and route write requests.
- Established the resource inventory: four existing Workers but no `foxtutor-learn`; two unrelated D1 databases but no `foxtutor-learn`; zero Workers Routes; two R2 buckets; and empty Access applications, identity providers and policies.
- Confirmed Access application and identity-provider write validation remains forbidden (`HTTP 403`, `auth.forbidden`, error `1010`) through the existing OAuth mechanism. No alternate environment, CI or project credential path was exposed.
- Rechecked the public homepage, `robots.txt` and sitemap before and after discovery; stored body hashes remained unchanged.

**Tests/commands:** direct sanitized REST probes using both credential mechanisms; `npx wrangler whoami`; `npx wrangler d1 list --json`; `npx wrangler r2 bucket list`; `env -u CLOUDFLARE_API_TOKEN npx wrangler deploy --dry-run`; local regression suite documented below.

**Deployment:** none. No production Worker, D1, route, Access application/policy, DNS record or mail delivery was changed.

**Handover:** make an existing Cloudflare credential with Zero Trust Access application, identity-provider and policy write permissions available to the runtime. Create a new credential only if no existing authorized mechanism exists. See `docs/evidence/phase-1/cloudflare-capability-check.txt` and `docs/handover/phase-1.md`.

## Phase 1.4 — Production activation preflight

### 2026-09-12 — Verify the intended production credential before mutation

**Status:** blocked; production remains unactivated

**Verification:**

- The only exposed `CLOUDFLARE_API_TOKEN` authenticated to the intended Foxlearningltd account and `foxtutor.org` zone.
- Account, zone, Worker and Access collection reads passed.
- D1, Workers Routes and R2 reads remained blocked.
- Safe invalid-payload probes for Access application and identity-provider writes returned HTTP 403, `auth.forbidden`, error `1010`.
- Wrangler reported missing user details and membership permissions for the exposed API token.
- The existing Wrangler OAuth session remains able to validate Worker, D1 and Workers Routes operations but does not provide the required Access write boundary.

**Production result:** no D1, Worker, route, Access, DNS, public-site or mail mutation was performed. The exact sanitized results are recorded in `docs/evidence/phase-1/phase-1.4-credential-check.txt`.

**Handover:** expose the existing Access-write-capable `foxtutor build token` through the runtime without creating, rolling or recording another credential. Do not begin production mutation until the Access application and identity-provider write probes authorize.

### 2026-09-12 — Runtime recheck after credential handover

**Status:** blocked before production mutation

**Verification:**

- Rechecked the runtime `CLOUDFLARE_API_TOKEN` without recording its value; it remains the previously blocked API-token mechanism rather than the intended Access-write-capable credential.
- Confirmed account, zone, Worker and Access collection reads.
- Confirmed D1, Workers Routes, R2 and Worker deployment operations remain authentication-blocked.
- Confirmed invalid-payload writes for Access applications, identity providers and policies remain forbidden (`HTTP 403`, `auth.forbidden`, error `1010`).
- Confirmed the separate Wrangler OAuth profile still lacks Access write capability and was not used for production mutation.
- Re-ran the public-site baseline and `npm run test:production`; public resources remain at their recorded hashes, while `/learn` remains the known public-site fall-through until the route and Access perimeter are activated.

**Production result:** no Worker, D1 database, route, Access resource, DNS record, mail message or public-site resource was created or changed.

**Evidence:** `docs/evidence/phase-1/phase-1.4-credential-check.txt`.

### 2026-09-12 — Runtime capability recheck and malformed-cookie hardening

**Status:** blocked; production remains unactivated

**Implementation/evidence:**

- Re-ran the account capability matrix with the credential exposed to this
  terminal. Wrangler still identifies it as the blocked User API Token rather
  than the intended Access-write-capable account token.
- Confirmed account, zone, Worker and Access reads, while D1, Workers Routes,
  R2, Worker deployment and Access application/identity-provider/policy writes
  remain blocked with the previously recorded HTTP 401/403 errors.
- Confirmed the existing Wrangler OAuth session can dry-run the Worker and
  inventory unrelated D1 databases but cannot write Access configuration.
- Hardened malformed cookie parsing so invalid percent-encoding fails closed
  without throwing before application authorization.
- Rechecked the public homepage, `robots.txt` and `sitemap.xml`; current body
  hashes match the stored baseline.

**Tests:** `npm test` (6 files, 12 tests), `npm run build`, `npm run check`,
`npm run test:browser`, `npm run test:production` (expected private-route
failure while production is inactive), direct public hash comparison.

**Deployment:** none. No production Worker, D1, route, Access resource, mail
message, DNS record or public-site resource was changed.

**Handover:** expose the existing `foxtutor build token` through
`CLOUDFLARE_API_TOKEN` or another authorized runtime path. Do not create,
rotate, replace or record a new token. See
`docs/evidence/phase-1/phase-1.4-credential-check.txt`.

## Phase 1.5 — Learn production activation

### 2026-09-12 — Deploy isolated Learn production foundation

**Status:** deployed; Phase 1 acceptance remains pending authenticated browser and mail evidence

**Production resources:**

- Worker `foxtutor-learn`, version `24b3ab69-ed6c-4721-aad3-8eda0a99fba7`.
- D1 `foxtutor-learn`, UUID `204dadc5-46ff-41b7-9da1-049f85d29422`.
- Remote `0001_foundation.sql` migration applied successfully.
- Routes `foxtutor.org/learn` and `foxtutor.org/learn/*` only.
- Access app `FoxTutor Learn`, ID `13a98192-7cbc-4a2c-bf2f-d4a4e1d2d70b`.
- Access policy `FoxTutor Learn Controlled Users`, ID `4f444ffd-503f-467e-b6e6-8914508f89fc`.
- Existing Google IdP reused; existing Mail and EDInterval Access resources were not modified.

**Controlled data:** seeded only `foxlearningltd@gmail.com` as `ADMIN` and `student.test@foxtutor.org` as `STUDENT`.

**Verification:** local test/build/check/browser suites passed; production smoke passed; D1 schema and route inventory passed; `/learn` reaches the Google Access boundary; public homepage, robots, sitemap and representative public route remained unchanged.

**Remaining limitations:** authenticated admin/student/unknown Chromium flows require controlled Google credentials, and the Fox Mail production adapter requires an `INTERNAL_API_TOKEN` plus a controlled destination for delivery/idempotency verification. No `phase-1-complete` tag was created.

## Phase 1.6 — Acceptance and closure preflight

### 2026-09-12 — Reconcile controlled identity and verify remaining acceptance boundaries

**Status:** blocked at explicit human checkpoints; completion tag not created

**Completed:**

- Verified the live Learn boundary, Worker deployment, production D1, exact routes and existing Learn Access application without recreating Phase 1.5 resources.
- Updated the production D1 student record from `student.test@foxtutor.org` to `jamesanf@gmail.com` with a guarded role/status/email predicate; the admin remained unchanged.
- Confirmed the final desired D1 users are `foxlearningltd@gmail.com` (`ADMIN`, `ACTIVE`) and `jamesanf@gmail.com` (`STUDENT`, `ACTIVE`).
- Inspected Fox Mail’s authoritative internal API contract. It requires the Fox Mail `INTERNAL_API_TOKEN`; its production secret inventory currently does not contain that secret, and the endpoint still returns the interactive Cloudflare Access boundary to unauthenticated machine requests.
- Re-ran `npm test`, `npm run build`, `npm run check`, `npm run test:browser` and `npm run test:production`; all passed.
- Rechecked `/`, `/robots.txt`, `/sitemap.xml` and `/about`; public body hashes remain equal to the stored baseline, and `/learn` remains an Access redirect rather than public-site fall-through.

**Outstanding human actions:** expose the existing Access-write-capable Learn credential so the Learn policy can replace `student.test@foxtutor.org` with `jamesanf@gmail.com`; configure Fox Mail’s existing machine-auth boundary and provide the required Learn Worker secret bindings without exposing values; then complete the three clean-profile Google browser checkpoints and one controlled Fox Mail send plus exact-key replay. No `phase-1-complete` tag or completion claim is permitted before those gates pass.

### 2026-09-12 — Acceptance recheck and explicit handover confirmation

**Status:** blocked; no completion tag created

**Verification:**

- Re-ran `npm test`, `npm run build`, `npm run check`, `npm run test:browser`
  and `npm run test:production`; all passed.
- Queried production D1 through the existing Wrangler OAuth session and
  confirmed exactly `foxlearningltd@gmail.com` as `ADMIN`/`ACTIVE` and
  `jamesanf@gmail.com` as `STUDENT`/`ACTIVE`.
- Rechecked the public homepage, `robots.txt`, sitemap and `/about`; the
  homepage, robots and sitemap hashes still match the stored baseline.
- Rechecked `/learn` with a Googlebot user agent; it reaches the Cloudflare
  Access login boundary and does not fall through to the public homepage.
- Rechecked Learn and Fox Mail Worker secret inventories without printing
  values. Learn has no mail secret bindings; Fox Mail has no
  `INTERNAL_API_TOKEN` secret.

**Handover:** the runtime still lacks Access policy write capability, the Fox
Mail bearer secret and a non-interactive Fox Mail Access Service Auth path.
Authenticated Chromium role/denial/noindex evidence and controlled Fox Mail
delivery/idempotency evidence remain unproven. See
`docs/handover/phase-1.md` and
`docs/evidence/phase-1/phase-1.6-acceptance-preflight.txt`.

### 2026-09-12 — Phase 1.6 authenticated acceptance evidence

**Status:** blocked only by Fox Mail production machine authentication; no completion tag created

**Completed:**

- Reconciled the existing `FoxTutor Learn` Access policy in place so only
  `foxlearningltd@gmail.com` and `jamesanf@gmail.com` are allowed.
- Verified production D1 contains exactly those active admin/student records;
  the temporary student identity is not active.
- Completed separate clean-profile Chromium checks for the admin shell, student
  shell, student-to-admin server denial and unknown-identity Access denial.
- Verified authenticated admin noindex metadata and `X-Robots-Tag`, session
  persistence after refresh, Secure/HttpOnly/Strict cookie attributes and
  absence of authentication tokens in localStorage.
- Verified exact Learn routes still target only `foxtutor-learn`; public
  homepage, robots, sitemap and `/about` regression checks remain unchanged.

**Tests:** `npm test`, `npm run build`, `npm run check`,
`npm run test:browser`, `npm run test:production`.

**Fox Mail result:** source and configuration inspection confirm the internal
endpoint requires `INTERNAL_API_TOKEN` and a non-interactive Access Service
Auth path. The Fox Mail production secret inventory has no
`INTERNAL_API_TOKEN`; the endpoint returns the interactive Access redirect.
No delivery or idempotency result was claimed.

**Handover:** restore/configure Fox Mail's existing machine-auth boundary and
provide the required Learn Worker secret bindings without exposing values.
Then run exactly one controlled send and exact-key replay before committing,
tagging and pushing Phase 1 completion.
