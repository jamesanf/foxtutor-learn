# Foxtutor Learn

Foxtutor Learn is a private, invite-only tutoring portal for students and the
Foxtutor administrator. It is a Cloudflare Worker application for lessons,
resources, notifications and structured lesson reports. It is not a public
registration system, password service, tutoring marketplace, Fox Mail
replacement or accounting system.

## Current status

**Phase:** Phase 4.2 deployed; formal Phase 4 closure remains pending authenticated acceptance
**Production URL:** <https://foxtutor.org/learn>
**Application release:** `282a2ba` on `main` and `origin/main`
**Worker:** `1d7584ea-a230-47d9-b367-88fb9035621d`
**D1 migrations:** `0001_foundation.sql` through `0009_international_students.sql`; no migration is pending

The current release includes structured D1 lesson reports, historical student
level snapshots, report attachments through the existing R2 resource pipeline,
admin report resend, humanised delivery timestamps, reactive report
save/send/resend actions, branded inline-styled email, empty-section omission,
one-page PDFs with a FoxTutor logo mark, and idempotent notification delivery.
Phase 4 remains open until authenticated student/admin, real Fox Mail, PDF
visual and no-storage acceptance evidence is recorded. There is no
`phase-4-complete` tag.

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
- Phase 5 cancellation automation and Phase 6 FreeAgent integration are
  deferred.

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
forward-only migrations before deploying code that depends on them. The
current Phase 4.2 release and acceptance procedure is documented in
[`docs/deployment/phase-4.2.md`](docs/deployment/phase-4.2.md).

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
| `docs/architecture/phase-4.2.md` | Structured report and delivery architecture |
| `docs/testing/phase-4.2.md` | Current tests and Phase 4 acceptance matrix |
| `docs/deployment/phase-4.2.md` | Current release and deployment record |
| `docs/security/phase-4.2.md` | Report, attachment and privacy controls |
| `docs/api/mail-boundary.md` | Fox Mail integration contract |
| `docs/architecture/` | Earlier phase architecture records |
| `docs/testing/` | Earlier phase validation and acceptance records |
| `docs/deployment/` | Earlier phase deployment records |

Historical documents retain the evidence for their own release. The current
status above and the latest Phase 4.2 documents are authoritative for this
working tree.

## Phase map

| Phase | Goal | State |
|---|---|---|
| 1 | Private Learn, Access identity, roles and anti-indexing | Complete |
| 2 | Students, lessons, ownership, calendar and lifecycle | Complete |
| 3 | Private lesson resources and R2 storage | Deployed; acceptance recorded in phase documents |
| 4 | Notifications and structured lesson reports | Phase 4.2 deployed; closure pending acceptance |
| 5 | Cancellation automation | Deferred |
| 6 | FreeAgent/accounting boundary | Deferred |
| 7 | Optional billing visibility and hardening | Deferred |

## Security model

There is no public registration or application password subsystem. Unknown or
disabled Access identities are denied. Sessions are opaque, server-side,
`Secure`, `HttpOnly`, `SameSite=Strict` cookies with separate CSRF tokens for
mutations. Student report and resource routes enforce ownership in D1; student
level is descriptive data only and is never used for authorization.
