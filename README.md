# Foxtutor Learn

Foxtutor Learn is a private, invite-only tutoring portal for students and the
Foxtutor administrator. It is a Cloudflare Worker application for lessons,
resources, notifications and structured lesson reports. It is not a public
registration system, password service, tutoring marketplace, Fox Mail
replacement or accounting system.

## Current status

**Phase:** Phase 6.2 accounting hardening implemented; commercial approval and external FreeAgent acceptance pending
**Production URL:** <https://foxtutor.org/learn>
**Application/runtime release:** Phase 6.2 accounting operations hardening
**Worker:** `1386d7d5-3c7a-42bf-89a2-965c0db2c8c1`
**D1 migrations:** `0001_foundation.sql` through `0017_accounting_operations.sql`

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
rescheduling history and operational billing classification. Phase 6.1 adds a separate, idempotent accounting outbox, encrypted FreeAgent
OAuth connection storage, sandbox/production adapter, bounded Worker delivery,
admin retry/reconciliation and accounting-history retention. Phase 6.2 adds
verified admin contact mappings, pinned company/environment identity and
additive manual-retry audit records. Live FreeAgent financial actions remain
disabled until the commercial policy, credentials and authenticated
sandbox/production acceptance are supplied.

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
- FreeAgent remains the accounting authority; Learn stores only integration
  identity, delivery state and external references.
- The authenticated shell uses the Learn logo, shared FoxTutor footer, and
  legal pages generated as an exact mirror of the public site's canonical
  terms and privacy source.

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
npm run check:legal
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
| `docs/architecture/student-profiles.md` | Student profile fields and academic-year progression |
| `docs/testing/phase-5.1.md` | Phase 5.1 tests and acceptance matrix |
| `docs/deployment/phase-5.1.md` | Phase 5.1 release and deployment record |
| `docs/architecture/learn-branding-legal.md` | Learn shell branding and portal legal policy boundary |
| `docs/security/phase-5.1.md` | Cancellation and rescheduling security controls |
| `docs/architecture/phase-6.1.md` | FreeAgent accounting boundary and contract |
| `docs/testing/phase-6.1.md` | Accounting integration acceptance matrix |
| `docs/deployment/phase-6.1.md` | Accounting release and deployment record |
| `docs/security/phase-6.1.md` | Accounting credential and retention controls |
| `docs/architecture/phase-6.2.md` | Commercial boundary and accounting operations |
| `docs/testing/phase-6.2.md` | Phase 6.2 automated and external acceptance state |
| `docs/deployment/phase-6.2.md` | Phase 6.2 release and human handover |
| `docs/security/phase-6.2.md` | Phase 6.2 security and operational controls |
| `docs/api/mail-boundary.md` | Fox Mail integration contract |
| `docs/architecture/` | Earlier phase architecture records |
| `docs/testing/` | Earlier phase validation and acceptance records |
| `docs/deployment/` | Earlier phase deployment records |

Historical documents retain the evidence for their own release. The current
status above and the latest Phase 6.2 documents are authoritative for this
working tree.

## Phase map

| Phase | Goal | State |
|---|---|---|
| 1 | Private Learn, Access identity, roles and anti-indexing | Complete |
| 2 | Students, lessons, ownership, calendar and lifecycle | Complete |
| 3 | Private lesson resources and R2 storage | Deployed; acceptance recorded in phase documents |
| 4 | Notifications and structured lesson reports | Complete |
| 5 | Cancellation and rescheduling automation | Deployed; authenticated acceptance pending |
| 6 | FreeAgent/accounting boundary | Phase 6.2 hardening deployed only; sandbox/commercial/production acceptance pending |
| 7 | Optional billing visibility and hardening | Deferred |

## Security model

There is no public registration or application password subsystem. Unknown or
disabled Access identities are denied. Sessions are opaque, server-side,
`Secure`, `HttpOnly`, `SameSite=Strict` cookies with separate CSRF tokens for
mutations. Student report and resource routes enforce ownership in D1; student
level is descriptive data only and is never used for authorization.
