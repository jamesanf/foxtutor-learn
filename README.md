# Foxtutor Learn

Foxtutor Learn is a private, invite-only tutoring portal for students and the Foxtutor administrator. It is a small Cloudflare-native application for lessons, resources, notifications and later operational workflows. It is not a public tutoring marketplace, public registration system, password service or replacement for Fox Mail, FreeAgent or GoCardless.

## Current status

**Phase:** 1.5 production activation deployed; authenticated browser and controlled mail verification remain pending
**Production URL:** `https://foxtutor.org/learn` (private Access perimeter active)
**Public site:** `https://foxtutor.org/` remains a separate read-only deployment
**Latest state:** `foxtutor-learn` Worker, production D1, exact Learn routes, Google-backed Access app/policy, branded shell, role model, session foundation, tests and public regression evidence are deployed

Phase 1 is not declared complete until authenticated admin/student/unknown browser flows, production noindex/session checks and a controlled Fox Mail delivery/idempotency test also pass. The 2026-09-12 Phase 1.5 activation deployed only Learn-scoped infrastructure and did not modify public-site infrastructure.

## Architecture

`foxtutor.org/learn` and `foxtutor.org/learn/*` are separate, narrowly scoped Worker routes. Cloudflare Access is the identity perimeter; the Worker maps the Access email to an active D1 user, creates an opaque server-side session, enforces `ADMIN`/`STUDENT` authorization and serves the private shell. Learn responses use `X-Robots-Tag` and an HTML robots meta tag. Mail remains behind the server-side `mail.foxtutor.org/internal/api/v1/messages/send` adapter boundary.

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

`npm test` runs unit, integration and security tests. `npm run test:browser` runs the static accessibility/noindex contract; authenticated Chromium production flows remain pending Access configuration. `npm run test:production` performs public-site and `/learn` smoke requests and is expected to fail its private-route assertion while `/learn` is still served by the public site. `npm run deploy` is only for an authorized production deployment after remote D1, Access and route permissions are available.

The deployment procedure and required manual Cloudflare steps are in [`docs/deployment/phase-1.md`](docs/deployment/phase-1.md). Never deploy from the public Foxtutor repository and never modify its Worker, Pages project, DNS or routes.

## Repository map

```text
src/                 Worker, auth, D1 access, security and mail boundary
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
| `docs/architecture/phase-1.md` | Worker, session and routing design |
| `docs/security/phase-1.md` | Access, authorization and privacy controls |
| `docs/deployment/phase-1.md` | Local, staging and production operations |
| `docs/api/mail-boundary.md` | Fox Mail integration contract |
| `docs/testing/phase-1.md` | Test matrix and evidence |
| `docs/evidence/phase-1/` | Public baseline and deployment evidence |
| `docs/handover/phase-1.md` | Exact human actions still required |

## Phase map

| Phase | Goal | State |
|---|---|---|
| 0 | Constitution and repository foundation | Bootstrap inherited |
| 1 | Private `/learn`, Google/Access auth, roles, anti-indexing | Production perimeter and foundation deployed; authenticated/mail evidence pending |
| 2 | Students, lessons and calendar | Deferred |
| 3 | R2 resources and document pipeline | Deferred |
| 4 | Mail notifications and reports | Deferred |
| 5 | Cancellation automation | Deferred |
| 6 | FreeAgent boundary | Deferred |
| 7 | Optional billing visibility and hardening | Deferred |

## Security model

There is no public registration and no application password subsystem. Only Access-authenticated identities reach the application boundary in production. Active D1 users are required; unknown or disabled identities receive a generic denial. Sessions are opaque, server-side, `Secure`, `HttpOnly`, `SameSite=Strict` cookies with a separate CSRF token for mutations. Learn content is private, non-cacheable and explicitly noindex.

## Known limitations

- Authenticated Chromium flows could not be completed because no controlled Google student credentials were available to this runtime; the clean unauthenticated profile reached the Google Access sign-in boundary.
- The production Fox Mail adapter is present, but no Fox Mail `INTERNAL_API_TOKEN` or Access Service Auth credentials were available, so no controlled production delivery was claimed.
- The production D1 currently contains only the controlled `foxlearningltd@gmail.com` admin identity and the placeholder `student.test@foxtutor.org` student identity; no real student data was added.
- Phase 2 domain features are intentionally not included.
