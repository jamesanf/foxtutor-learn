# Foxtutor Learn

Foxtutor Learn is a private, invite-only tutoring portal for students and the
Foxtutor administrator. It is a Cloudflare Worker application for lessons,
resources, notifications and structured lesson reports. It is not a public
registration system, password service, tutoring marketplace, Fox Mail
replacement or accounting system.

## Current status

**Phase:** Phase 5.1 deployed; authenticated workflow acceptance pending
**Production URL:** <https://foxtutor.org/learn>
**Application/runtime release:** `08e9ae3`
**Worker:** `31a62fb3-7c88-4bb8-a073-9cc06d34e1d7`
**D1 migrations:** `0001_foundation.sql` through `0013_notification_controls.sql`

The current release includes structured D1 lesson reports, historical student
level snapshots, report attachments through the existing R2 resource pipeline,
admin report resend, humanised delivery timestamps, reactive report
save/send/resend actions, branded inline-styled email, empty-section omission, one-page PDFs with a
FoxTutor logo mark and adaptive feedback layout, and idempotent notification
delivery.
Production notifications also use `james@foxtutor.org` as their reply address
for consistent recipient engagement. Brevo-controlled tracking and
unsubscribe headers remain outside Learn's control.
Phase 4 is closed at the preserved `phase-4-complete` baseline. Phase 5 adds
server-authoritative cancellation, late exception requests, admin decisions,
rescheduling history and operational billing classification. FreeAgent and
other accounting actions remain outside this release.

## Architecture

- Cloudflare Access is the production identity perimeter.
- The Worker maps the Access identity to an active D1 user and creates an
  opaque server-side session.
- `ADMIN` and `STUDENT` authorization is enforced in route handlers and
  ownership queries.
- Learn HTML and assets are private, non-cacheable and explicitly noindex.
- `lesson_reports` is the dedicated structured report entity; PDF, email and
  HTML are projections of persisted snapshots.
- Fox Mail is accessed only through the server-side `mail.foxtutor.org`
  adapter.
- Lesson files use the existing D1 metadata and private R2 resource pipeline.
- Phase 6 FreeAgent integration is deferred.

## Local development

```sh
npm install
npm test
npm run build
npm run check
npm run dev
```

Local Wrangler uses `wrangler.local.jsonc` and a separate local D1 database.
Production credentials and mail secrets are not stored in the repository.

## Testing and deployment

```sh
npm test
npm run build
npm run check
npm run test:browser
npm run test:production
git diff --check
```

Use `npm run deploy` only for an authorised production deployment. Apply
forward-only migrations before deploying code that depends on them. The Phase 5.1 release and acceptance procedure is documented in
[`docs/deployment/phase-5.1.md`](docs/deployment/phase-5.1.md).

## Repository map

```text
src/                 Worker, domain, database, mail, report and client code
public/              Private Learn CSS and bundled client assets
migrations/          Forward-only D1 migrations
tests/               Unit, integration, security and browser contracts
scripts/              Browser shell and production smoke helpers
docs/                Architecture, security, deployment and test evidence
PHASE_PLAN.md        Master phase scope and acceptance gates
CHANGELOG.md         Material implementation history
```

## Documentation index

| Document | Purpose |
|---|---|
| `PHASE_PLAN.md` | Current phase scope and acceptance gates |
| `PROJECT_STRUCTURE.md` | Filesystem and separation-of-concerns rules |
| `CHANGELOG.md` | Material implementation history |
| `docs/architecture/phase-5.1.md` | Cancellation, exception, rescheduling and billing boundary |
| `docs/testing/phase-5.1.md` | Phase 5.1 tests and acceptance matrix |
| `docs/deployment/phase-5.1.md` | Phase 5.1 release and deployment record |
| `docs/security/phase-5.1.md` | Cancellation and rescheduling security controls |
| `docs/api/mail-boundary.md` | Fox Mail integration contract |
| `docs/architecture/` | Earlier phase architecture records |
| `docs/testing/` | Earlier phase validation and acceptance records |
| `docs/deployment/` | Earlier phase deployment records |

Historical documents retain the evidence for their own release. The current
status above and the latest Phase 5.1 documents are authoritative for this
working tree.

## Phase map

| Phase | Goal | State |
|---|---|---|
| 1 | Private Learn, Access identity, roles and anti-indexing | Complete |
| 2 | Students, lessons, ownership, calendar and lifecycle | Complete |
| 3 | Private lesson resources and R2 storage | Deployed; acceptance recorded in phase documents |
| 4 | Notifications and structured lesson reports | Complete |
| 5 | Cancellation and rescheduling automation | Deployed; authenticated acceptance pending |
| 6 | FreeAgent/accounting boundary | Deferred |
| 7 | Optional billing visibility and hardening | Deferred |

## Security model

There is no public registration or application password subsystem. Unknown or
disabled Access identities are denied. Sessions are opaque, server-side,
`Secure`, `HttpOnly`, `SameSite=Strict` cookies with separate CSRF tokens for
mutations. Student report and resource routes enforce ownership in D1; student
level is descriptive data only and is never used for authorization.
