# Foxtutor Learn

Foxtutor Learn is a private, invite-only tutoring portal for students and the Foxtutor administrator. It is a small Cloudflare-native application for lessons, resources, notifications and later operational workflows. It is not a public tutoring marketplace, public registration system, password service or replacement for Fox Mail, FreeAgent or GoCardless.

## Current status

**Phase:** Phase 4.2 implementation deployed; formal Phase 4 closure pending authenticated acceptance
**Production URL:** `https://foxtutor.org/learn` (private Access perimeter active)
**Public site:** `https://foxtutor.org/` remains a separate read-only deployment
**Current application release:** `064d617` on `main` and `origin/main`
**Current Worker:** `fd195518-ddce-402f-93e4-43043fe41eaf`
**Production migrations:** `0001_foundation.sql` through `0009_international_students.sql`; no remote migrations are pending
**Latest state:** Phase 4.2 is deployed with start-time report eligibility, automatic completion after lesson end, structured D1 reports, historical student-level snapshots, an opt-in International flag, idempotent UK clock-change reminders and the existing Fox Mail notification boundary. The report editor includes default bullet mode, numbered-list toggling, bold/highlight markers, compact auto-growing fields, up to five lesson attachments submitted with Send report, and saved-draft state/actions. Sent reports now expose an admin-only Resend report action and refresh their sent timestamp after successful delivery. The latest release also fixes the student report 1101 caused by ambiguous joined report columns, humanises sent timestamps, generates compact one-page PDFs, and uses branded inline-styled report emails. Automated and unauthenticated production smoke checks pass. Controlled authenticated Fox Mail, visual PDF and no-storage acceptance remain open.

The final Access policy permits only `foxlearningltd@gmail.com` and `jamesanf@gmail.com`; the production D1 contains only those active admin/student records after controlled fixture cleanup. Phase 1 is closed and tagged `phase-1-complete`. Phase 2.1 adds forward-only student/lesson tables and server-rendered CRUD flows while preserving the existing Access, session, role, noindex, public-site and Fox Mail boundaries. Migration `0002_students_lessons.sql` is applied to production and Worker version `85129275-02b5-40be-8626-db554aa6903f` is deployed. Phase 2.1 acceptance is complete and tagged `phase-2.1-complete`. Phase 2.3 uses the existing lessons domain without a new migration or calendar database model.

### Phase 2.3 operating state

**Master implementation pass — local implementation (2026-09-12):** added a reusable week-period/range helper using the existing UTC/IANA conversion functions; added admin and student range queries with server-side student ownership enforcement and student-safe columns; added `/learn/admin/calendar` and `/learn/student/calendar`; added previous/today/next navigation, empty-day states, explicit scheduled/completed/cancelled labels, lesson links to canonical routes, and day-prefilled links into the existing lesson creation form. The responsive representation stacks days at tablet/mobile widths rather than shrinking a dense seven-column grid.

**Tests:** `npm test` (9 files, 23 tests); `npm run build`; `npm run check`; `npm run test:browser`; `git diff --check` all pass locally.

**Production status:** deployed and accepted through the Phase 2.5 pass as Worker version `56ab94cf-a035-4ec2-82b0-c5109299ebfa`. Direct HTTP checks confirm the calendar feed path reaches the Worker without Access login and normal Learn paths remain Access-protected. Fresh authenticated admin/student Chromium acceptance, lesson workflow integration, timezone/privacy verification, responsive checks and guarded fixture cleanup passed.

**Current acceptance gates:** local calendar query/type/privacy contracts, production calendar UI, authenticated ownership/privacy, responsive browser inspection, keyboard/labels/contrast evidence, deployment verification, cleanup and documentation reconciliation PASS.

**Remaining work:** none for Phase 2. Calendar client refresh cadence remains provider-controlled; recurrence, availability, notifications, resources, billing and reporting remain deferred.

**Closure:** production acceptance is recorded in `docs/testing/phase-2.5.md`.

### Phase 2.6 operating state

**Audit, deployment and sign-off (2026-09-12):** independently confirmed the clean `main` tree at `phase-2.5-complete`, the live Worker/D1/Access chain, the exact production migration set and the stale historical wording that needed reconciliation. Refined both calendar routes so the calendar is rendered before the subscription utility. The subscription is now a native `<details>/<summary>` disclosure, closed on ordinary page loads, with a compact summary row, restrained private-link warning, labeled URL/copy control, regeneration action and concise Apple/Google/other iCalendar instructions when opened. No migration or feed architecture change was made. The deployed Worker is `12109e60-3f5a-4bc2-8b89-8eefc7586249`.

**Final validation:** `npm test`, `npm run build`, `npm run check`, `npm run test:browser`, `npm run test:production` and `git diff --check` pass. Production Access, D1, route, responsive, disclosure, feed-boundary and public-site checks pass. The final record is [`docs/testing/phase-2.6.md`](docs/testing/phase-2.6.md); deployment details are in [`docs/deployment/phase-2.6.md`](docs/deployment/phase-2.6.md).

**Closure:** Phase 2.6 was historically tagged `phase-2.6-complete`; later Phase 2.7 and 2.8 remediation reopened final Phase 2 acceptance. Do not move to Phase 3 until the current browser and production gates pass.

### Phase 2.7 operating state

**Dependency assessment and implementation (2026-09-12):** Phase 2.6's accepted subscription refinement did not resolve the core week-first calendar UX. FullCalendar Standard was evaluated against the server-rendered Worker architecture, local asset bundling, browser footprint, accessibility, timezone handling and licensing. The coherent registry release is `@fullcalendar/core@6.1.21` plus `@fullcalendar/daygrid@6.1.21`, both MIT licensed; the unrelated v7 core package was not adopted because matching Standard view plugins are not available in the registry. No premium package or hosted asset is used.

The new renderer defaults to Month, provides a secondary Week switch, Previous/Today/Next controls, concise linked lesson events, normal overflow handling and no repeated per-day Add lesson controls. Admin lesson creation remains the single heading-level action; students receive only their authorized read-only event projection. Subscription remains below the calendar and collapsed by default.

**Validation:** `npm test`, `npm run build`, `npm run check`, `npm run test:browser`, `npm run test:production` and `git diff --check` pass. Production route smoke and invalid-feed boundary checks pass after Worker `db13557c3-ffc2-43d2-a4e5-1f12e21eb44d`; fresh authenticated admin/student acceptance, responsive/accessibility evidence, feed regression confirmation, cleanup, documentation reconciliation and `phase-2.7-complete` remain pending.

### Phase 2.8 operating state

**Calendar and lesson UX refinement (2026-09-12):** Real browser review of the Phase 2.7 replacement exposed an oversized calendar surface, unexplained navigation blocks, a text-heavy subscription utility, browser-native regeneration confirmation and a lesson form that required manual end-time and timezone decisions. The remediation keeps FullCalendar Standard, the existing server-rendered event projection, canonical lesson routes, ownership queries, feed/token model, UTC storage and Access boundary.

**Implementation:** Calendar page copy and surrounding spacing are reduced; the FullCalendar toolbar is compact, uses the existing Material-style chevron icons with period-aware accessible labels, and keeps Month default/Week secondary. Subscription is collapsed by default and now contains only the private link, Copy, generation/regeneration, a concise invalidation warning and in-app confirmation/success feedback. New lesson creation is a compact Student/Date/Start/Lesson link workflow with 15-minute start choices, a derived 55-minute end, concise `Europe/London` context and Notes behind Additional details. Edit/detail support and all backend validation remain intact.

**Validation:** `npm test` (12 files, 35 tests), `npm run build`, `npm run check`, `npm run test:browser`, `npm run test:production` and `git diff --check` pass locally; the post-deployment public smoke also passes. Authenticated production browser acceptance, responsive screenshots, feed regression, cleanup and final Phase 2 closure remain pending. See [`docs/testing/phase-2.8.md`](docs/testing/phase-2.8.md), [`docs/architecture/phase-2.8.md`](docs/architecture/phase-2.8.md) and [`docs/deployment/phase-2.8.md`](docs/deployment/phase-2.8.md).

### Phase 2.9 operating state

**UX audit and implementation (2026-09-12):** Phase 2.8's functional improvements still left a compressed toolbar, subscription utility and lesson form, while the create workflow rendered a 96-option time selector and calculated the End preview only after Date and Start were both present. Phase 2.9 replaces those patterns with a balanced calendar surface and toolbar, visible inline SVG navigation arrows, a grouped subscription utility with an internal confirmation surface, a native 24-hour `input[type="time"]` using `step="900"`, a responsive lesson grid and an immediate date-independent 55-minute End preview. No framework, migration, feed, authorization, Access or public-site architecture changed.

**Current gate:** `npm test` (13 files, 38 tests), `npm run build`, `npm run check`, `npm run test:browser`, `npm run test:production` and `git diff --check` pass locally; post-deployment `npm run test:production` also passes. Real authenticated admin/student browser review at 1440px, 1440px/75% zoom, 820px and 390px remains mandatory and is currently blocked by the absence of a Chromium runtime in this session. Phase 2.9 is not complete and Phase 2 remains open. See [`docs/testing/phase-2.9.md`](docs/testing/phase-2.9.md) and [`docs/architecture/phase-2.9.md`](docs/architecture/phase-2.9.md).

### Phase 2.4 operating state

**Master implementation pass — local implementation (2026-09-12):** added `calendar_feeds` migration `0003_calendar_feeds.sql` with one durable feed identity per Learn user, hash-only opaque bearer tokens, token suffix metadata, rotation timestamps and revocation state. Added admin and explicitly linked-student feed ownership queries, a live `/learn/calendar/feed/<opaque-token>` Worker route, private/no-store/noindex headers, generic invalid-token denial, and on-request lesson projection from the existing `lessons` table. Added a small internal RFC 5545 serializer using CRLF line endings, stable `<lesson-id>@foxtutor.org` UIDs, UTC `DTSTAMP`/`LAST-MODIFIED`/`DTSTART`/`DTEND`, `CONFIRMED`/`CANCELLED` mapping, HTTPS `URL`, escaping and 75-octet line folding. Added calendar subscription cards, copy-link workflow, explicit private-link warning, regeneration confirmation and Apple/Google URL instructions for both roles.

**Feed policy:** the live feed contains the recent 90-day window plus the next 365 days, individual timed lesson events only, no recurrence/all-day events, and no lesson notes. Student feeds query only the active Student record explicitly linked to the authenticated Learn user. Regeneration updates the durable feed row and invalidates the previous token. The raw token is returned only in the intentional post-generation subscription UI; it is not stored in D1.

**Tests:** local type-check, Wrangler dry-run and Vitest coverage for token entropy/validation, migration shape, route classification, stable UIDs, UTC timezone preservation, status changes, escaping, CRLF output, line folding and feed range. Production HTTP, authenticated browser, Access path-scope, real subscription refresh and guarded cleanup acceptance are recorded in `docs/testing/phase-2.5.md`.

**Deployment status:** completed in the Phase 2.5 deployment pass. Worker version `56ab94cf-a035-4ec2-82b0-c5109299ebfa` is live, `0003_calendar_feeds.sql` is applied remotely, and the existing broad `/learn/*` Access application is supplemented by a separate bypass application for only `/learn/calendar/feed/*`.

**Remaining work:** none for the implemented calendar scope. External calendar applications control refresh timing; Learn provides a read-only live feed and does not promise immediate synchronization.

**Closure:** production migration, Worker deployment, Access routing, authenticated acceptance, feed security and cleanup are recorded in `docs/deployment/phase-2.5.md` and `docs/testing/phase-2.5.md`.

### Phase 2.2 operating state

**Pass 1 — visual hierarchy correction (2026-09-12):** replaced the pale header with the public FoxTutor action blue (`#0e7490`), preserved the existing logo, improved header identity/logout contrast, grounded the page background, differentiated navigation/content/table/form surfaces, strengthened status and focus visibility, and added active navigation state plus the matching blue browser theme color. No data, authorization or lifecycle logic changed.

**Tests run:** `npm test`; `npm run build`; `npm run check`; `npm run test:browser`; `npm run test:production`; `git diff --check`; live public-site status checks. Chrome was available but headless capture did not complete reliably in this environment; authenticated Chromium acceptance remains the next human-assisted pass.

**Deployment status:** deployed to production as Worker version `85129275-02b5-40be-8626-db554aa6903f`. `/learn` continues to redirect to Cloudflare Access. Public homepage, `/about`, `/robots.txt` and `/sitemap.xml` remain unchanged and Learn remains absent from the public sitemap.

**Pass 1 gates at completion:** FoxTutor visual identity PASS; blue top bar PASS; page hierarchy/contrast implementation PASS; production deployment PASS; public regression PASS. Authenticated production acceptance remained for later passes.

**Pass 2 — authenticated admin production acceptance (2026-09-12):** PASS. Using a fresh authenticated Chromium session as `foxlearningltd@gmail.com`, verified controlled student create/view/edit/deactivate, explicit linked Student A and unlinked Student B setup, lesson create/view/edit, HTTPS external URL persistence, private note persistence and scheduled-to-completed status change. Fixture IDs are retained only in session state for the next isolation/privacy pass.

**Pass 2 gates at completion:** visual identity, blue top bar, page hierarchy/contrast, production deployment, public regression and authenticated admin CRUD PASS. Student own-lesson access and privacy gates remained for later passes.

**Pass 3 — authenticated student and privacy acceptance (2026-09-12):** PASS. Using a separate authenticated Chromium session as `jamesanf@gmail.com`, verified the explicitly linked Student A lesson is visible, the unlinked Student B lesson is absent, private admin notes and other-student data are absent from raw HTML responses, direct Student B lesson-ID access returns 404 without Student B data, and `/learn/admin`, `/learn/admin/students` and `/learn/admin/lessons` return 403 without admin data.

**Pass 3 gates at completion:** visual identity, blue top bar, page hierarchy/contrast, production deployment, public regression, authenticated admin CRUD, student own-lesson access, cross-student isolation, student/admin denial, explicit account linking and notes/privacy response inspection PASS. Responsive and final operational gates remained for later passes.

**Pass 4 — authenticated responsive and accessibility acceptance (2026-09-12):** PASS. In live authenticated Chromium sessions, checked student and admin dashboards, lists, forms and lesson details at 1440px desktop, 820px tablet and 390px mobile widths. Rendered pages had no document or control overflow; mobile navigation became horizontally scrollable within its own surface; table cards, form controls, status badges, active navigation, blue top bar and content surfaces remained usable. Screenshots were captured from the authenticated mobile admin lesson form and student lesson list.

**Pass 4 gates at completion:** visual identity, blue top bar, page hierarchy/contrast, production deployment, public regression, authenticated admin CRUD, student own-lesson access, cross-student isolation, student/admin denial, explicit account linking, notes/privacy response inspection and responsive desktop/tablet/mobile inspection PASS. Timezone, overlap, lifecycle, cleanup and final regression remained for Pass 5.

**Next pass at that point:** Pass 5 — final regression, lifecycle/timezone/overlap checks, controlled fixture cleanup and closure decision.

**Pass 5 — final regression, cleanup and closure (2026-09-12):** COMPLETE. Re-ran the full automated suite, production smoke, public endpoint regression and authenticated post-cleanup admin/student checks. Verified Europe/London and America/New_York display under an overridden browser timezone, overlap rejection and non-overlap acceptance, scheduled/completed/cancelled lifecycle behavior, invalid transition rejection and student lifecycle immutability. Deactivated/cancelled fixtures through the authenticated admin mechanisms, then removed the exact controlled fixture IDs with a guarded production cleanup; no real identity or unrelated record was touched. Final D1 state contains only `foxlearningltd@gmail.com` (`ADMIN`, `ACTIVE`) and `jamesanf@gmail.com` (`STUDENT`, `ACTIVE`), with migrations `0001_foundation.sql`, `0002_students_lessons.sql` and `0003_calendar_feeds.sql`.

**Final acceptance gates:** all Phase 2.1–2.5 acceptance gates PASS, including desktop/tablet/mobile responsive inspection, authenticated production regression, public regression, feed security and change propagation, real subscribed-calendar refresh, controlled fixture cleanup, documentation reconciliation, clean Git tree and verified production deployment. No recurrence, availability automation, notifications, resources or billing work was started.

## Architecture

`foxtutor.org/learn` and `foxtutor.org/learn/*` are separate, narrowly scoped Worker routes. Cloudflare Access is the identity perimeter; the Worker maps the Access email to an active D1 user, creates an opaque server-side session, enforces `ADMIN`/`STUDENT` authorization and serves private HTML. A student record has one login/contact email; create and edit resolve that email to an active `STUDENT` Learn user and store the explicit `learn_user_id` link, while student lesson queries enforce ownership in SQL. Learn responses use `X-Robots-Tag` and an HTML robots meta tag. Mail remains behind the server-side `mail.foxtutor.org/internal/api/v1/messages/send` adapter boundary.

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

`npm test` runs unit, integration and security tests. `npm run build` type-checks and bundles the local calendar client. `npm run test:browser` runs the static accessibility/noindex contract. `npm run test:production` performs public-site and `/learn` smoke requests and verifies the live Access redirect and public boundary. Authenticated Chromium production acceptance is recorded in the historical Phase 2.5/2.6 records and the current Phase 2.7/2.8 acceptance records. `npm run deploy` is only for an authorized production deployment after source/configuration changes.

The deployment procedures are in [`docs/deployment/phase-1.md`](docs/deployment/phase-1.md), [`docs/deployment/phase-2.1.md`](docs/deployment/phase-2.1.md), [`docs/deployment/phase-2.5.md`](docs/deployment/phase-2.5.md) and [`docs/deployment/phase-2.6.md`](docs/deployment/phase-2.6.md). Never deploy from the public Foxtutor repository and never modify its Worker, Pages project, DNS or routes.

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
| `docs/architecture/phase-2.4.md` | Private live iCalendar feed architecture and security model |
| `docs/deployment/phase-2.5.md` | Production calendar migration, Worker and Access deployment |
| `docs/deployment/phase-2.6.md` | Historical subscription UX deployment and sign-off |
| `docs/deployment/phase-2.7.md` | Month-first calendar deployment and open acceptance gates |
| `docs/security/phase-1.md` | Access, authorization and privacy controls |
| `docs/deployment/phase-1.md` | Local, staging and production operations |
| `docs/api/mail-boundary.md` | Fox Mail integration contract |
| `docs/testing/phase-1.md` | Test matrix and evidence |
| `docs/testing/phase-2.1.md` | Phase 2.1 validation and local HTTP matrix |
| `docs/testing/phase-2.4.md` | Phase 2.4 serializer, token and local HTTP validation |
| `docs/testing/phase-2.5.md` | Production calendar acceptance matrix and evidence |
| `docs/testing/phase-2.6.md` | Final subscription UX, regression and historical sign-off record |
| `docs/testing/phase-2.7.md` | Month-first calendar replacement and final Phase 2.7 acceptance matrix |
| `docs/architecture/phase-4.1.md` | Historical notification/report architecture baseline |
| `docs/architecture/phase-4.2.md` | Structured report, level, reminder and attachment architecture |
| `docs/security/phase-4.1.md` | Historical notification security baseline |
| `docs/security/phase-4.2.md` | Structured report and attachment security controls |
| `docs/testing/phase-4.1.md` | Historical notification/report test matrix |
| `docs/testing/phase-4.2.md` | Current Phase 4.2 test and closure matrix |
| `docs/deployment/phase-4.1.md` | Historical Phase 4.1 deployment record |
| `docs/deployment/phase-4.2.md` | Current Phase 4.2 deployment and closure record |
| `docs/architecture/phase-3.1.md` | Resource storage, metadata, authorization, retention and failure model |
| `docs/security/phase-3.1.md` | Resource upload, download, deletion and private-storage controls |
| `docs/testing/phase-3.1.md` | Resource acceptance matrix and remaining authenticated gates |
| `docs/deployment/phase-3.1.md` | Resource bucket, migration and Worker deployment record |
| `docs/architecture/phase-3.2.md` | Contextual resource upload UX and category decision |
| `docs/testing/phase-3.2.md` | Resource UX contracts and acceptance matrix |
| `docs/deployment/phase-3.2.md` | Phase 3.2 release and production verification sequence |
| `docs/architecture/phase-2.7.md` | Calendar dependency, rendering, timezone and authorization decision |
| `docs/testing/phase-2.8.md` | Calendar density, subscription and lesson UX acceptance matrix |
| `docs/architecture/phase-2.8.md` | Phase 2.8 presentation and lesson interaction decisions |
| `docs/deployment/phase-2.8.md` | Phase 2.8 deployment and production gate record |
| `docs/testing/phase-2.9.md` | Phase 2.9 composition, time workflow and acceptance matrix |
| `docs/architecture/phase-2.9.md` | Phase 2.9 UI composition and client/server interaction decisions |
| `docs/deployment/phase-2.9.md` | Phase 2.9 release gates and deployment state |
| `docs/testing/phase-2.10.md` | Final Phase 2.10 UX, security, responsive and production acceptance matrix |
| `docs/architecture/phase-2.10.md` | Final timetable, Bookings, dashboard, student and lesson interaction decisions |
| `docs/deployment/phase-2.10.md` | Phase 2.10 deployment gates and current production parity |
| `docs/testing/phase-2.11.md` | Measured visual contracts and real-browser acceptance matrix |
| `docs/architecture/phase-2.11.md` | Root cause and redesigned calendar/subscription composition |
| `docs/deployment/phase-2.11.md` | Phase 2.11 release and production gate record |
| `docs/deployment/phase-2.1.md` | Phase 2.1 migration and deployment sequence |
| `docs/evidence/phase-1/` | Public baseline and deployment evidence |
| `docs/handover/phase-1.md` | Exact human actions still required |

## Phase map

| Phase | Goal | State |
|---|---|---|
| 0 | Constitution and repository foundation | Bootstrap inherited |
| 1 | Private `/learn`, Google/Access auth, roles, anti-indexing | Complete and tagged `phase-1-complete` |
| 2.1 | Students, lessons, ownership and lifecycle | Complete and tagged `phase-2.1-complete` |
| 2.3 | Calendar and scheduling UX around lessons | Deployed; acceptance closed through Phase 2.5 |
| 2.4 | Live read-only iCalendar subscriptions | Deployed; production infrastructure closed through Phase 2.5 |
| 2.5 | Production calendar completion and initial Phase 2 closure | Complete and tagged `phase-2.5-complete` |
| 2.6 | Final calendar subscription UX remediation, regression audit and definitive Phase 2 sign-off | Complete and tagged `phase-2.6-complete` |
| 2.7 | Month-first FullCalendar replacement, optional Week view and final Phase 2 acceptance | Remediated by 2.8; production acceptance pending |
| 2.8 | Calendar density, navigation, subscription and lesson-creation UX refinement after real browser review | Remediated by 2.10 |
| 2.9 | UI composition and lesson-time workflow correction | Remediated by 2.10 |
| 2.10 | Final timetable, Bookings, navigation, dashboard, student model and end-to-end UX closure | In progress |
| 2.11 | Definitive calendar UI remediation, measurable visual contracts and production acceptance | In progress |
| 3.1 | Lesson resources, private R2, document metadata and admin file manager | Deployed as Worker `dfebaca6-f1e4-4019-bb5a-37f92344c161`; authenticated acceptance pending |
| 3.2 | Contextual Add Resource UX, dropzone selection and category removal from application code | Local implementation; production acceptance pending |
| 4 | Mail notifications and reports | Phase 4.2 deployed as Worker `ceaaeb0f-eb36-4936-8238-7401a04edd05` from `34223ff`; authenticated/Fox Mail/PDF acceptance pending |
| 5 | Cancellation automation | Deferred |
| 6 | FreeAgent boundary | Deferred |
| 7 | Optional billing visibility and hardening | Deferred |

## Security model

There is no public registration and no application password subsystem. Only Access-authenticated identities reach the application boundary in production. Active D1 users are required; unknown or disabled identities receive a generic denial. Sessions are opaque, server-side, `Secure`, `HttpOnly`, `SameSite=Strict` cookies with a separate CSRF token for mutations. Learn content is private, non-cacheable and explicitly noindex.

## Known limitations

- Authenticated Chromium evidence was captured with separate clean profiles; no passwords or browser credentials were requested or recorded. The unknown identity was denied at the final Cloudflare Access perimeter before reaching Learn.
- Fox Mail authentication is configured well enough for the production API to return structured validation errors. The first authenticated report attempt failed because Learn reloaded notifications without joining the recipient email, sending an empty recipient; this was fixed in `34223ff` and deployed as Worker `ceaaeb0f-eb36-4936-8238-7401a04edd05`. A successful real-recipient send still needs to be re-tested.
- No real student data was added; the only active D1 users are the controlled admin and student identities.
- Phase 2.1 is intentionally limited to students, lessons, ownership, lifecycle, notes, HTTPS lesson URLs, timezone-safe storage and overlap-aware scheduling.
- Phase 2.3 calendar UX and Phase 2.4 feed infrastructure remain deployed and production-accepted. Historical phase records retain their contemporaneous wording; the current authoritative state is the status block above and the latest phase documents. Phase 3 resource infrastructure remains deployed and is included in the `phase-3-complete` release. Phase 4.2 is deployed with migrations `0008_structured_lesson_reports.sql` and `0009_international_students.sql`; the recipient-resolution regression is fixed, while authenticated production mail/browser acceptance, PDF visual inspection and no-storage evidence remain pending.
