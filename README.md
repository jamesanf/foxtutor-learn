# Foxtutor Learn

Foxtutor Learn is a private, invite-only tutoring portal for students and the Foxtutor administrator. It is a small Cloudflare-native application for lessons, resources, notifications and later operational workflows. It is not a public tutoring marketplace, public registration system, password service or replacement for Fox Mail, FreeAgent or GoCardless.

## Current status

**Phase:** 2.1 student and lesson management deployed; authenticated production acceptance pending
**Production URL:** `https://foxtutor.org/learn` (private Access perimeter active)
**Public site:** `https://foxtutor.org/` remains a separate read-only deployment
**Latest state:** `foxtutor-learn` Worker, production D1, exact Learn routes, Google-backed Access app/policy, branded shell, role model, session foundation, tests and public regression evidence are deployed. Production D1 now contains `foxlearningltd@gmail.com` as `ADMIN` and `jamesanf@gmail.com` as `STUDENT`.

The final Access policy permits only `foxlearningltd@gmail.com` and `jamesanf@gmail.com`; the production D1 contains those active admin/student records. Phase 1 is closed and tagged `phase-1-complete`. Phase 2.1 adds forward-only student/lesson tables and server-rendered CRUD flows while preserving the existing Access, session, role, noindex, public-site and Fox Mail boundaries. Migration `0002_students_lessons.sql` is applied to production and Worker version `3a81dca9-539e-4e42-8c6a-1bc058902fe2` is deployed; authenticated production acceptance remains pending.

## Architecture

`foxtutor.org/learn` and `foxtutor.org/learn/*` are separate, narrowly scoped Worker routes. Cloudflare Access is the identity perimeter; the Worker maps the Access email to an active D1 user, creates an opaque server-side session, enforces `ADMIN`/`STUDENT` authorization and serves private HTML. Student records are explicitly linked to Learn users, and student lesson queries enforce that ownership in SQL. Learn responses use `X-Robots-Tag` and an HTML robots meta tag. Mail remains behind the server-side `mail.foxtutor.org/internal/api/v1/messages/send` adapter boundary.

## Local development

```sh
npm install
npm test
npm run build
npm run check
npm run dev
```

Local Wrangler uses `wrangler.local.jsonc` and `ENVIRONMENT=local`; production credentials and mail secrets are never read from source control. The local D1 database is separate from production. A clean local migration can be proven with `--persist-to /tmp/foxtutor-learn-d1-clean`.

## Testing and deployment

`npm test` runs unit, integration and security tests. `npm run test:browser` runs the static accessibility/noindex contract. `npm run test:production` performs public-site and `/learn` smoke requests and currently verifies the live Access redirect and public boundary. Authenticated Chromium production flows remain a human checkpoint. `npm run deploy` is only for an authorized production deployment after source/configuration changes.

The deployment procedures are in [`docs/deployment/phase-1.md`](docs/deployment/phase-1.md) and [`docs/deployment/phase-2.1.md`](docs/deployment/phase-2.1.md). Never deploy from the public Foxtutor repository and never modify its Worker, Pages project, DNS or routes.

## Repository map

```text
src/                 Worker, auth, D1 access, domain, security and mail boundary
public/               Private Learn CSS/JS assets
migrations/           Forward-only D1 migrations
tests/unit/           Pure authorization, identity and security tests
tests/integration/    Migration and mail adapter tests
tests/security/       Privacy/indexing contract tests
tests/browser/        Browser-test location reserved for authenticated flows
scripts/              Browser contract and production smoke helpers
docs/                 Architecture, security, deployment, API and evidence
```

## Documentation index

| Document | Purpose |
|---|---|
| `AGENT_INSTRUCTION.md` | Permanent agent operating policy and phase numbering |
| `PHASE_PLAN.md` | Master phases and acceptance gates |
| `PROJECT_STRUCTURE.md` | Filesystem and separation-of-concerns rules |
| `CHANGELOG.md` | Material implementation history |
| `docs/architecture/phase-1.md` | Worker, session and routing foundation |
| `docs/architecture/phase-2.1.md` | Student, lesson, ownership and time model |
| `docs/security/phase-1.md` | Access, authorization and privacy controls |
| `docs/deployment/phase-1.md` | Local, staging and production operations |
| `docs/api/mail-boundary.md` | Fox Mail integration contract |
| `docs/testing/phase-1.md` | Test matrix and evidence |
| `docs/testing/phase-2.1.md` | Phase 2.1 validation and local HTTP matrix |
| `docs/deployment/phase-2.1.md` | Phase 2.1 migration and deployment sequence |
| `docs/evidence/phase-1/` | Public baseline and deployment evidence |
| `docs/handover/phase-1.md` | Exact human actions still required |

## Phase map

| Phase | Goal | State |
|---|---|---|
| 0 | Constitution and repository foundation | Bootstrap inherited |
| 1 | Private `/learn`, Google/Access auth, roles, anti-indexing | Complete and tagged `phase-1-complete` |
| 2.1 | Students, lessons, ownership and lifecycle | Deployed; authenticated production acceptance pending |
| 2 | Calendar and later scheduling features | Deferred |
| 3 | R2 resources and document pipeline | Deferred |
| 4 | Mail notifications and reports | Deferred |
| 5 | Cancellation automation | Deferred |
| 6 | FreeAgent boundary | Deferred |
| 7 | Optional billing visibility and hardening | Deferred |

## Security model

There is no public registration and no application password subsystem. Only Access-authenticated identities reach the application boundary in production. Active D1 users are required; unknown or disabled identities receive a generic denial. Sessions are opaque, server-side, `Secure`, `HttpOnly`, `SameSite=Strict` cookies with a separate CSRF token for mutations. Learn content is private, non-cacheable and explicitly noindex.

## Known limitations

- Authenticated Chromium evidence was captured with separate clean profiles; no passwords or browser credentials were requested or recorded. The unknown identity was denied at the final Cloudflare Access perimeter before reaching Learn.
- Fox Mail requires its `INTERNAL_API_TOKEN` plus a non-interactive Access Service Auth path before Learn can claim production delivery/idempotency evidence.
- No real student data was added; the only active D1 users are the controlled admin and student identities.
- Phase 2.1 is intentionally limited to students, lessons, ownership, lifecycle, notes, HTTPS lesson URLs, timezone-safe storage and overlap-aware scheduling.
- Authenticated Phase 2.1 production smoke acceptance remains pending controlled browser identities.
