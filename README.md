# Foxtutor Learn

Foxtutor Learn is a private, invite-only tutoring portal for students and the Foxtutor administrator. It is a small Cloudflare-native application for lessons, resources, notifications and later operational workflows. It is not a public tutoring marketplace, public registration system, password service or replacement for Fox Mail, FreeAgent or GoCardless.

## Current status

**Phase:** 1.2 remediation completed locally; production completion blocked by Cloudflare control-plane permissions and required Access configuration
**Production URL:** `https://foxtutor.org/learn` (route not activated)
**Public site:** `https://foxtutor.org/` remains a separate read-only deployment
**Latest local state:** Worker, branded shell, role model, session foundation, fresh local D1 migration, corrected Fox Mail adapter, tests and public regression evidence are implemented

Phase 1 is not declared complete until Cloudflare Access, Google identity, D1, the narrow route, deployment and post-deployment smoke evidence all pass.

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

`npm test` runs unit, integration and security tests. `npm run test:browser` runs the static accessibility/noindex contract; authenticated Chromium production flows remain pending Access configuration. `npm run test:production` performs public-site and `/learn` smoke requests. `npm run deploy` is only for an authorized production deployment after remote D1, Access and route permissions are available.

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
| 1 | Private `/learn`, Google/Access auth, roles, anti-indexing | Implementation prepared; production blocked |
| 2 | Students, lessons and calendar | Deferred |
| 3 | R2 resources and document pipeline | Deferred |
| 4 | Mail notifications and reports | Deferred |
| 5 | Cancellation automation | Deferred |
| 6 | FreeAgent boundary | Deferred |
| 7 | Optional billing visibility and hardening | Deferred |

## Security model

There is no public registration and no application password subsystem. Only Access-authenticated identities reach the application boundary in production. Active D1 users are required; unknown or disabled identities receive a generic denial. Sessions are opaque, server-side, `Secure`, `HttpOnly`, `SameSite=Strict` cookies with a separate CSRF token for mutations. Learn content is private, non-cacheable and explicitly noindex.

## Known limitations

- The current Cloudflare token can read the account, zone, Workers and Access collections and can perform Worker dry-runs, but a real Worker asset upload and direct D1, R2, Workers Route and Access write operations fail with documented permission errors.
- The production D1 ID, Access Google identity provider/application/policy, scoped route and production mail service-auth configuration therefore remain unconfigured.
- Authenticated Chromium flows, production noindex checks and real mail delivery cannot be honestly recorded until those controls are completed.
- Phase 2 domain features are intentionally not included.
