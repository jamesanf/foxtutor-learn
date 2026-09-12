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
