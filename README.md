# Foxtutor Learn

Foxtutor Learn is a private, invite-only tutoring portal for students and the
Foxtutor administrator. It is a Cloudflare Worker application for lessons,
resources, notifications and structured lesson reports. It is not a public
registration system, password service, tutoring marketplace, Fox Mail
replacement, payment system or accounting ledger.

## Current status

**Phase:** Phase 7.10 — FreeAgent Sandbox/Production acceptance preparation
**Production URL:** <https://foxtutor.org/learn>
**Application/runtime release:** Phase 7 recurring lessons, billing operations and payment readiness
**Repository branch:** `main`
**Deployed source commit:** `ce85e6f3d89a6eeddb0e99b94a643af6e04ae5f8`
**Worker version:** recorded in the final Phase 7.10 release report after deployment
**D1 migrations:** `0001_foundation.sql` through `0029_accounting_category_environment.sql` deployed
**Automated validation:** 38 test files, 222 tests passing

The Phase 7 implementation has a deployed operational baseline but is not
production-ready. Phase 7.4 diagnosed the reported authenticated
`/learn/student/billing` Worker 1101 as Cloudflare D1 rejecting the former
six-way `UNION ALL` billing-history query with `SQLITE_ERROR: too many terms in
compound SELECT`; the route fix is deployed with regression coverage.
Authenticated post-deployment page acceptance is still outstanding because
this execution environment has no legitimate Cloudflare Access student
session. Real FreeAgent Sandbox financial mutations and payment/Direct Debit
lifecycle evidence also remain outstanding; the application must continue to
fail closed until those gates and the remaining commercial approvals are
complete.

Phase 7.5 is the financial safety and acceptance gate. It formalises billing
states and invariants, adds the customer-facing Direct Debit status journey,
and requires comprehensive failure, concurrency, reconciliation, provider
Sandbox and authenticated runtime evidence. It remains **NOT READY** until
those engineering and provider gates are evidenced; only genuine commercial
decisions may remain human approval gates.

Phase 7.6 makes Direct Debit the only normal customer-facing billing rail,
adds customer-level provisioning and mandate reconciliation, keeps the
unavoidable FreeAgent UI initiation explicit, removes payment-choice language
from student billing, adds an audited admin-only emergency exception, and
adds a cheap once-daily sentinel to the existing Worker schedule. The
sentinel is non-destructive and does not run the Vitest suite in production.

Phase 7.7 repairs stale unresolved mandate reads, preserves submitted versus
pending versus confirmed collection state, adds synthetic provider fixtures, a
read-only admin billing-chain audit, and bounded sentinel checks for stale
mandate/payment state. It keeps FreeAgent as the sole FoxTutor payment
integration boundary and adds no direct GoCardless API authority. The detailed
evidence and remaining release gate are in
[`docs/phase-7.7.md`](docs/phase-7.7.md).

The Worker has the approved FreeAgent Sandbox secret bindings and company pin
configured. Sandbox OAuth has completed successfully for Fox Learning Ltd, and
the connection tokens are encrypted and persisted in D1. The live D1 state has
one verified Sandbox contact mapping for contact `257175`, with no conflicting
mapping, outbox row, retry audit row or financial mutation. Phase 7.10 replaces
raw category-URL entry with a provider-backed company category selector and
binds the saved category to its environment and company. Invoice-producing
acceptance remains fail-closed until an administrator explicitly selects and
saves the approved category mapping.

Phase 7.8 identifies the real production chain as student
`2dba78cd-0ce9-4aa2-918f-c3fb9d3b683b` -> verified FreeAgent contact `257175`
in Sandbox. The stored local mandate state remains honestly `UNKNOWN` because
the prior release did not retain the exact raw contact mandate field. The
current release distinguishes missing, malformed, unexpected, contact
mismatch, and provider transport/authentication outcomes rather than
presenting them as one generic provider failure. The existing mandate is not
replaced, no real financial mutation is performed, and the final provider/API
and authenticated-browser evidence remains a human-assisted acceptance gate.
See [`docs/phase-7.8.md`](docs/phase-7.8.md).

Phase 7.10 keeps Sandbox and Production as separate FreeAgent trust domains,
adds business-facing invoice mapping diagnostics and category lookup, and
records the Direct Debit setup email as instructional/support-only. No
Production OAuth, invoice, payment, mandate mutation or £1 collection is
claimed by this release. See [`docs/phase-7.10.md`](docs/phase-7.10.md).

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
Phase 7 adds the operational completion of that architecture: the
Europe/London invariant, recurring-series administration, billing history,
invoice and credit detail, student billing visibility, canonical payment
readiness, provider status reconciliation, actionable alert controls and
recovery-safe scheduling. These surfaces use individual FreeAgent invoices,
never FreeAgent recurring invoice profiles.
Credit-covered lessons are settled in FoxTutor without zero-value FreeAgent
invoices. Definite provider invoice failures compensate local credit
allocations with auditable reversal entries; unknown outcomes remain
reconciliation-required.
The application-side Phase 6 implementation is complete and hardened. The
phase remains operationally open because the latest attempted acceptance
handoff supplied literal placeholders rather than executable approvals for
the `ADMIN_CANCELLED` consequence, effective-date policy and FreeAgent
billing/category configuration. Those values have not been persisted, and no
real Sandbox financial mutation has been attempted.
The deployed contact-mapping persistence defect was corrected, and regression
coverage now verifies successful contact verification through D1 persistence.

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
- FoxTutor owns recurring lessons, lesson instances, billing events, customer
  credit and payment readiness; FreeAgent remains authoritative for accounting
  documents, provider references and exposed payment/mandate state.
- Normal customers use Direct Debit. Student pages never expose PAYG,
  payment-method selection, bank-transfer instructions or provider IDs.
- FreeAgent/GoCardless remains the sensitive payment boundary. FoxTutor stores
  only safe provider references and reconciled lifecycle state.
- Accounting follows the boundary `operational event -> accounting
  consequence -> outbox -> scheduled Worker -> FreeAgent adapter`.
-   Phase 7 uses individual FreeAgent invoices, not recurring invoice profiles,
  and retains a separate local payment/alert/reconciliation history. FoxTutor
  business time is always Europe/London, recurrence is bounded to six weeks,
  and `PAYMENT_SECURED` means credit coverage or confirmed provider payment,
  not merely collection submission.
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
current Phase 7 summary, deployment boundary and acceptance status are
documented in
[`docs/phase-7.md`](docs/phase-7.md). Detailed decimal phase records remain
linked from that summary.

## Repository map

```text
src/                 Worker, domain, database, mail, report and client code
public/              Private Learn CSS and bundled client assets
migrations/          Forward-only D1 migrations
tests/               Unit, integration, security and browser contracts
scripts/              Browser shell and production smoke helpers
docs/                Architecture, security, deployment and test evidence
docs/PHASE_PLAN.md   Master phase scope and acceptance gates
docs/CHANGELOG.md    Material implementation history
```

## Documentation index

| Document | Purpose |
|---|---|
| `docs/PHASE_PLAN.md` | Current phase scope and acceptance gates |
| `docs/PROJECT_STRUCTURE.md` | Filesystem and separation-of-concerns rules |
| `docs/CHANGELOG.md` | Material implementation history |
| `docs/architecture/phase-5.1.md` | Cancellation, exception, rescheduling and billing boundary |
| `docs/architecture/student-profiles.md` | Student profile fields and academic-year progression |
| `docs/testing/phase-5.1.md` | Phase 5.1 tests and acceptance matrix |
| `docs/deployment/phase-5.1.md` | Phase 5.1 release and deployment record |
| `docs/architecture/learn-branding-legal.md` | Learn shell branding and portal legal policy boundary |
| `docs/security/phase-5.1.md` | Cancellation and rescheduling security controls |
| `docs/phase-6.md` | Current Phase 6 status, evidence matrix and closure gate |
| `docs/architecture/gocardless-freeagent.md` | FreeAgent-GoCardless boundary and safety decision |
| `docs/phase-7.md` | Current Phase 7 summary, status and acceptance boundary |
| `docs/phase-7.6.md` | Direct Debit-first provisioning, emergency policy and sentinel boundary |
| `docs/phase-7.4.md` | Worker 1101 diagnosis, fix, deployment evidence and remaining gates |
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
`docs/CHANGELOG.md`; the current Phase 6 documents above are the only authoritative
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
| 7 | Billing engine and long-term operations hardening | 1101 diagnosed and fixed in source/deployment; authenticated runtime, provider acceptance and commercial gates remain open |
| 7.5 | Financial safety and acceptance | Direct Debit UX and formal acceptance model added; comprehensive engineering/provider/runtime evidence remains open |
| 7.6 | Direct Debit-first provisioning and reliability | Implemented in source with forward-only migrations, bounded sentinel and automated coverage; production deployment and authenticated/provider acceptance remain release gates |

## Security model

There is no public registration or application password subsystem. Unknown or
disabled Access identities are denied. Sessions are opaque, server-side,
`Secure`, `HttpOnly`, `SameSite=Strict` cookies with separate CSRF tokens for
mutations. Student report and resource routes enforce ownership in D1; student
level is descriptive data only and is never used for authorization.
