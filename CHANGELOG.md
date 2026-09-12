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
