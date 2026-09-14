# Foxtutor Learn

Foxtutor Learn is a private, invite-only tutoring portal for students and the
Foxtutor administrator. It is a Cloudflare Worker application for lessons,
resources, notifications and structured lesson reports. It is not a public
registration system, password service, tutoring marketplace, Fox Mail
replacement, payment system or accounting ledger.

## Current status

**Phase:** Engineering-complete; Phase 6 remains externally acceptance-blocked
**Production URL:** <https://foxtutor.org/learn>
**Application/runtime release:** Phase 6 accounting boundary hardening
**Executable deployment commit:** `13af4f7`
**Deployed source:** `13af4f7`
**Worker version:** `890be944-debd-462f-8fb5-8160b4910fa6`
**D1 migrations:** `0001_foundation.sql` through `0020_accounting_company_name.sql`

The Worker has the approved FreeAgent Sandbox secret bindings and company pin
configured. Sandbox OAuth has completed successfully for Fox Learning Ltd, and
the connection tokens are encrypted and persisted in D1. Billing settings show
the connection status, environment, company identity and reauthentication
action. No financial mutation has been performed.

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
rescheduling history and operational billing classification. Phase 6 adds a separate, idempotent accounting outbox, encrypted FreeAgent
OAuth connection storage, a sandbox/production adapter, bounded Worker
delivery, admin retry/reconciliation, verified contact mappings, pinned
company/environment identity, retry audit records and accounting-history
retention. Unsupported or incomplete commercial configuration fails closed.
The initial approved normal lesson value is 55.00 GBP with no VAT charged.
Billing settings are persisted and editable by an admin at
`/learn/admin/accounting/settings`; GBP remains immutable, while amount, item
type, category, payment terms and the explicit FreeAgent sales-tax rate can be
changed. A zero rate is the current non-VAT setting, and every saved rate is
sent explicitly so FreeAgent defaults cannot add tax. `ADMIN_CANCELLED` remains
an explicitly unresolved accounting consequence and is not treated as an
invoice decision.
The application-side Phase 6 implementation is complete and hardened. The
phase remains operationally open only because the remaining external
commercial/provider acceptance requires human-owned approval/credentials and
controlled real FreeAgent mutations.

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
- Accounting follows the boundary `operational event -> accounting
  consequence -> outbox -> scheduled Worker -> FreeAgent adapter`.
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
forward-only migrations before deploying code that depends on them. The
current Phase 6 deployment state and acceptance boundary are documented in
[`docs/deployment/phase-6.md`](docs/deployment/phase-6.md) and
[`docs/handover/phase-6.md`](docs/handover/phase-6.md).

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
| `docs/phase-6.md` | Current Phase 6 status, evidence matrix and closure gate |
| `docs/architecture/phase-6.md` | Current accounting architecture and state model |
| `docs/testing/phase-6.md` | Current automated coverage and external acceptance boundary |
| `docs/deployment/phase-6.md` | Current deployment state and rollout order |
| `docs/security/phase-6.md` | Current security and operational controls |
| `docs/handover/phase-6.md` | Exact sandbox and production acceptance runbook |
| `docs/api/mail-boundary.md` | Fox Mail integration contract |
| `docs/architecture/` | Earlier phase architecture records |
| `docs/testing/` | Earlier phase validation and acceptance records |
| `docs/deployment/` | Earlier phase deployment records |

Historical Phase 6.1, 6.2 and 6.3 release chronology is retained in
`CHANGELOG.md`; the current Phase 6 documents above are the only authoritative
operational records.

## Phase map

| Phase | Goal | State |
|---|---|---|
| 1 | Private Learn, Access identity, roles and anti-indexing | Complete |
| 2 | Students, lessons, ownership, calendar and lifecycle | Complete |
| 3 | Private lesson resources and R2 storage | Deployed; acceptance recorded in phase documents |
| 4 | Notifications and structured lesson reports | Complete |
| 5 | Cancellation and rescheduling automation | Deployed; authenticated acceptance pending |
| 6 | FreeAgent/accounting boundary | Engineering-complete; external commercial/provider acceptance pending |
| 7 | Optional billing visibility and hardening | Deferred |

## Security model

There is no public registration or application password subsystem. Unknown or
disabled Access identities are denied. Sessions are opaque, server-side,
`Secure`, `HttpOnly`, `SameSite=Strict` cookies with separate CSRF tokens for
mutations. Student report and resource routes enforce ownership in D1; student
level is descriptive data only and is never used for authorization.
