# Changelog

All material changes to the Foxtutor Learn project are recorded here in chronological order. Entries are retained; do not rewrite history.

### 2026-09-13 — Phase 3.2 resource upload UX remediation

**Status:** deployed as Worker `86417b0e-3656-4087-b787-a0c5cb1014f5` from commit `74e9ddd266e69cee3c6bf6d1245f02d17572c755`; authenticated acceptance pending

- Redesigned Add Resource around a focused file-selection workflow with a styled, keyboard-accessible drag/drop zone, derived filename/type/size state, Change file interaction, upload progress and concise success navigation.
- Added server-resolved lesson and student entry contexts so known associations are displayed as read-only context instead of repeated selectors; retained the generic Student + optional Lesson workflow for the resource manager.
- Removed category from resource policy, D1 queries, upload creation, list rendering, detail rendering and filters. Phase 3.1 historically introduced the category column; the deployed D1 column is intentionally retained unused for schema compatibility.
- Added student and lesson resource entry buttons, compact resource list metadata and responsive resource upload composition without changing R2 keys, private storage, validation, idempotency, authorization, deletion, retention or PDF inspection.
- Added resource UX source contracts and Phase 3.2 architecture/testing/deployment records.

### 2026-09-13 — Phase 3.1 lesson resources and private document infrastructure

**Status:** deployed as Worker `dfebaca6-f1e4-4019-bb5a-37f92344c161`; authenticated resource acceptance pending

- Added forward-only `0004_resources.sql` with student/lesson relationships, uploader ownership, opaque storage keys, original filename/content metadata, SHA-256, PDF page count, category, upload status, idempotency key, timestamps and 12-month retention review metadata.
- Added private production bucket `foxtutor-learn-resources` and local bucket `foxtutor-learn-resources-local`, both bound as `RESOURCES_BUCKET`; existing mail/image buckets were not reused.
- Added admin resource manager at `/learn/admin/resources` with server-side search/category filtering, shared 12/24/48 pagination, upload form, compact metadata view, private open/download, detail view and explicit delete confirmation.
- Added student `/learn/student/resources`, lesson-level resource sections and authorized download routes. Student queries resolve resource-to-lesson-to-student ownership in D1 and return generic 404 responses for unauthorized IDs.
- Added synchronous Worker upload validation for PDF, DOCX, TXT, PNG, JPEG and WEBP; dangerous active-content types are rejected, server-generated keys are used, and multipart uploads have CSRF, size, signature and association checks.
- Added idempotent `uploading` → `available`/`failed` handling with exact-key R2 cleanup on metadata failure. PDFs receive lightweight signature/page-count inspection; OCR and asynchronous compression remain explicitly deferred because the 25 MiB hard limit avoids an oversized synchronous processing path.
- Updated navigation, responsive resource UI, client lesson filtering/file preview, security documentation and deployment/testing records. Phase 2.12's open production/visual/tag gates remain distinct and were not rewritten.

**Tests:** `npm test`; `npm run build`; `npm run check`; `npm run test:production`; `npm run test:browser`; clean local D1 migration through `0004_resources.sql`; `git diff --check`.

**Production:** `0004_resources.sql` applied to D1 `foxtutor-learn`; dedicated R2 buckets created; Worker `dfebaca6-f1e4-4019-bb5a-37f92344c161` deployed. Authenticated admin/student resource acceptance remains pending.

### 2026-09-13 — Phase 2.12 final tutoring workflow refinement

**Status:** deployed as Worker `9f2b7ebf-a37a-4711-a7b5-d6c233f72d20`; authenticated production acceptance pending

- Replaced the generic admin Lessons navigation destination with the operational `Past Lessons` label while retaining `/learn/admin/lessons` and the existing `lessons` D1 table.
- Added a server-side historical query for completed, cancelled and elapsed lessons, ordered newest first, without allowing future scheduled lessons into Past Lessons.
- Unified Bookings and Past Lessons around one lesson-list presentation and one conventional footer with `Showing start-end of total`, accessible Previous/Next navigation, compressed page numbers and a labeled `Show per page` selector supporting exactly 12, 24 and 48.
- Removed the obsolete Rows links and calendar regeneration confirmation markup/client flow. Generation and regeneration are now one-click secure POST actions; regeneration immediately replaces the existing token and displays the new URL.
- Updated subscription copy to identify Apple Calendar, Google Calendar, Outlook and other iCalendar-compatible apps. No calendar sizing, feed security, authorization, D1 schema or public-site changes were made.
- Added Phase 2.12 architecture/testing/deployment records and updated the README/phase plan. The public production smoke passes; authenticated browser acceptance, feed invalidation verification and release tagging remain pending because no Chromium runtime is available in this environment.

### 2026-09-12 — Phase 2.11 definitive calendar UI remediation

**Status:** deployed as Worker `8f157d02-a729-4813-b017-2049371dec3c`; authenticated production browser acceptance pending

- Identified the Phase 2.10 root cause in rendered Chrome: a clamp-based FullCalendar host height expanded Month rows to roughly 116px, while FullCalendar's actual event text was white over pastel status backgrounds.
- Replaced the giant host-height strategy with FullCalendar Standard `height: "auto"`, `expandRows: false`, `fixedWeekCount: false` and compact natural day-frame sizing. Week remains the default with 09:00–21:00 focus and 30-minute visual slots; quarter-hour lesson placement and creation are unchanged.
- Changed Month events to one-line `time student` content and added view-aware weekday headers so Month labels remain concise and correct on desktop/mobile.
- Corrected all rendered status colours to saturated dark surfaces and explicitly inherited colour through `.fc-event-main`; real Chrome computed-colour checks measure 7.13:1–8.31:1 for Scheduled, Completed and Cancelled.
- Recomposed the subscription utility into a grid-based panel with a link row, action/warning row and self-contained confirmation. Hidden confirmation contributes no layout height; mobile controls stack without horizontal overflow.
- Added `npm run test:browser:visual`, a real Chrome contract that checks rendered contrast, event/text bounds, Month row fit/no internal scrollbar, collapsed subscription geometry and overflow. Captured ignored evidence under `test-results/phase-2.11/`.
- Local gates pass: `npm test` (14 files, 42 tests), `npm run build`, `npm run check`, `npm run test:browser`, `npm run test:browser:visual`, `npm run test:production` and `git diff --check`. Production public smoke, invalid-token feed denial, and remote D1 migration checks pass. Authenticated production acceptance remains unclaimed because no production Access/browser credential is available.

### 2026-09-12 — Phase 2.10 final tutoring workflow and information-architecture refinement

**Status:** deployed; authenticated production acceptance and final Phase 2 closure pending

- Opened Phase 2.10 as the final Phase 2 UX pass because the Month-first calendar, duplicate dashboard navigation and missing upcoming-bookings workflow still did not meet the product standard.
- Added the compatible MIT-licensed Standard `@fullcalendar/timegrid@6.1.21` package beside the existing pinned core/daygrid packages. The bundled calendar now defaults to `timeGridWeek`, keeps `dayGridMonth` secondary, focuses on 09:00–21:00, opens at 09:00, and renders concise in-bounds event title/time content without repeating timezone text.
- Added visible TimeGrid-specific event styling, compact slot density, Week/Month toolbar contracts and maintained the existing inline SVG navigation affordances, canonical lesson links, authorized event projection and status styling.
- Added admin-only `/learn/admin/bookings`, a server-side D1 query/count model over future `scheduled` lessons, earliest-first ordering, safe page/size validation, 12/24/48 page sizes, responsive rows and conventional pagination. Completed and cancelled lessons are excluded from the normal upcoming list.
- Replaced the duplicate dashboard quick-link card grid with upcoming-booking preview, next lesson, upcoming count and active-student summaries. Added Bookings to the admin sidebar while retaining Lessons as the broader record-management destination.
- Preserved the single student/login email model, explicit active-STUDENT linking, ownership predicates, UTC/IANA storage, 55-minute native lesson time workflow, feed/token security, Access boundary and public-site separation.
- Added UI/source contracts and query tests for TimeGrid, visible 09:00–21:00 configuration, concise events and server-side Bookings pagination.
- Scoped mobile table-card rules to Bookings/table surfaces so FullCalendar's internal TimeGrid tables retain their structural layout, and bounded the timetable viewport for a readable desktop/mobile surface.
- Local validation passes: `npm test` (14 files, 41 tests), `npm run build`, `npm run check`, `npm run test:browser`, `npm run test:production` and `git diff --check`. Rendered local authenticated browser review covers 1440px, approximately 75% desktop zoom, 820px and 390px, including Week/Month navigation, event positioning, mobile overflow, Dashboard, Bookings, Create Lesson and Student form checks.
- Committed as `68ba651` and pushed to `origin/main`. Deployed Worker `foxtutor-learn` version `56471854-7ff2-47bd-b9a0-70f488f0d029` at `2026-09-12T21:58:00.509Z`; `/learn.css` and `/learn.js` were uploaded and the `foxtutor.org/learn` routes were updated. Post-deployment public smoke, Access redirects for Learn routes, invalid-token feed denial and remote D1 migration checks pass. Authenticated production browser acceptance was not run because no authenticated production browser session/Access credential is available in this environment; no `phase-2.10-complete` tag exists.

### 2026-09-12 — Phase 2.9 UI composition and lesson-time workflow correction

**Status:** deployed; authenticated browser acceptance pending

- Opened Phase 2.9 because Phase 2.8 improved behavior but still presented compressed composition, weakly demonstrated calendar iconography, a cramped subscription utility and a 96-option start-time selector.
- Added a deliberate calendar surface and toolbar spacing, visible inline SVG Previous/Next icons with period-aware accessible labels, and a compact Month/Week control treatment without changing FullCalendar Standard or server-authorized events.
- Reworked the subscription disclosure into a grouped utility with a dedicated read-only link field, Copy link action, grouped regeneration action, concise warning, internal alertdialog confirmation and success status.
- Replaced the create-lesson time select with a native 24-hour `input[type="time"]` using `step="900"`, preserved server-side quarter-hour validation, and made the 55-minute End preview update immediately from Start alone, including midnight crossover.
- Added responsive form-grid composition for Student, Date, Start, derived duration/timezone, Lesson link, Additional details and aligned actions. Updated UI contracts to reject the obsolete 96-option selector and require visible icon/confirmation mechanisms.
- No migration, dependency, feed, authorization, Access, public-site or calendar-engine change was made. Deployed Worker `a844a418-b858-4a8c-a348-25a91df964d2` at 2026-09-12 21:04 UTC; post-deployment public smoke passes. Authenticated browser acceptance remains blocked until a Chromium runtime is available; do not create a Phase 2.9 or final Phase 2 tag.

### 2026-09-12 — Student login email simplification

- Replaced the separate contact-email and Learn-account-email fields in student create/edit forms with one `Login email` field.
- The single email is now used for both the student record and Learn access; it must resolve to an active `STUDENT` Learn account, which is stored as the explicit `learn_user_id` ownership link.

### 2026-09-12 — Phase 2.8 calendar and lesson UX refinement

**Status:** deployed; authenticated production acceptance pending

- Opened Phase 2.8 after real browser review of Phase 2.7 found excessive calendar height at desktop/75% zoom, weak Previous/Next affordances, unnecessary calendar explanation copy, a text-heavy subscription utility, browser-native regeneration confirmation and a lesson form with unnecessary manual end-time/timezone complexity.
- Kept FullCalendar Standard `@fullcalendar/core@6.1.21` and `@fullcalendar/daygrid@6.1.21`, with Month as the default, Week as the only secondary view, compact toolbar/grid styling, standard chevrons and period-aware accessible labels.
- Removed calendar-only instructional copy and retained one admin Add lesson action with canonical lesson links and unchanged student event ownership.
- Simplified the collapsed subscription utility to the private link, Copy, Generate/Generate new link, a concise invalidation warning and in-app confirmation/status feedback. Removed all browser-native dialog usage from Learn source.
- Redesigned standard lesson creation around Student, Date, Start, a derived 55-minute end, optional HTTPS Lesson link and collapsed Additional details for Notes. Start choices are limited to 15-minute increments; the existing UTC/IANA and overlap validation remains authoritative.
- Added Europe/London DST and 55-minute domain coverage, UI contract assertions, responsive calendar/form styles and Phase 2.8 architecture/testing/deployment records.
- Ran focused UX/timezone tests, the complete Vitest suite (12 files, 35 tests), `npm run build`, `npm run check`, `npm run test:browser`, `npm run test:production` and `git diff --check`; local automated/static/production-smoke gates pass.
- Deployed the Learn Worker as `999b4239-49f2-4bc3-9dfd-a2bb29d46637` at `2026-09-12T20:23:42Z` with the Phase 2.8 asset changes. Post-deployment public smoke passed; authenticated browser acceptance, feed/privacy regression, cleanup and final Phase 2 closure remain open.
- Do not create `phase-2.8-complete`; historical `phase-2.5-complete` and `phase-2.6-complete` tags remain intact.

### 2026-09-12 — Phase 2.7 deployment pass

**Status:** deployed; authenticated production acceptance pending

- Deployed the Month-first FullCalendar Standard replacement as Worker `db13557c3-ffc2-43d2-a4e5-1f12e21eb44d` with the existing `foxtutor.org/learn` routes.
- Live checks confirmed admin/student calendar paths remain behind the existing Access application, invalid feed requests retain generic private `404` behavior, and the public homepage, robots and sitemap remain unaffected.
- No D1 migration, feed serializer, token model, Access policy or public-site code changed. The previous Worker `12109e60-3f5a-4bc2-8b89-8eefc7586249` remains the rollback target.
- Fresh authenticated Chromium acceptance, cross-student privacy, timezone/feed regression, responsive/accessibility evidence, controlled cleanup and the completion tag remain open.

### 2026-09-12 — Phase 2.7 calendar UX replacement

**Status:** local implementation complete; production deployment and final Phase 2 acceptance pending

- Reopened calendar UX remediation because Phase 2.6 improved subscription hierarchy but the core calendar remained bespoke, week-first and cluttered with repeated per-day actions.
- Evaluated the existing renderer, FullCalendar Standard, framework wrappers and Premium/Scheduler options against the Worker architecture, browser bundle, responsive behavior, accessibility, timezone model, licensing and five-year maintenance goal.
- Selected and pinned the compatible MIT-licensed Standard packages `@fullcalendar/core@6.1.21` and `@fullcalendar/daygrid@6.1.21`; no Premium package, license key, CDN, hosted service or SPA framework was introduced. The registry's incompatible `@fullcalendar/core@7.1.0` package was not mixed with unavailable v7 view plugins.
- Replaced the server-rendered bespoke week grid with a server-authorized event projection and bundled vanilla FullCalendar enhancement. Month is the default; Week is secondary; the single toolbar owns Previous, Today, Next, title and view switching.
- Removed repeated per-day Add lesson links and empty-day action surfaces. Admin retains one canonical Add lesson action, event clicks retain canonical role-specific lesson routes, and students remain read-only.
- Preserved the lessons table, ownership queries, UTC/IANA timezone model, feed system, Access boundary and collapsed secondary subscription utility.
- Local gates pass: `npm test`, `npm run build`, `npm run check`, `npm run test:browser`, `npm run test:production` and `git diff --check`. Fresh authenticated production browser acceptance, deployment, feed/privacy regression, cleanup, final documentation reconciliation and `phase-2.7-complete` remain open.

### 2026-09-12 — Production acceptance and definitive Phase 2 sign-off

**Status:** complete; Phase 2 closed

- Deployed the refined calendar subscription UX as Worker `12109e60-3f5a-4bc2-8b89-8eefc7586249`.
- Independently verified the live admin calendar hierarchy at 1440px, 820px and 390px: calendar first, subscription closed by default, native disclosure keyboard behavior, restrained warning and no horizontal overflow in the expanded mobile view.
- Reconfirmed the live Access boundary, exact D1 migration set, final user/feed population, invalid feed denial and unchanged public-site boundary. The accepted Phase 2.5 student/feed/ownership evidence remains valid because no student authorization or feed architecture changed.
- Ran `npm test`, `npm run build`, `npm run check`, `npm run test:browser`, `npm run test:production` and `git diff --check`; all passed.
- Reconciled README, agent instructions, phase plan, architecture, deployment, testing and changelog records. No D1 migration, public-site change, Fox Mail change or new service was introduced.
- Created `phase-2.6-complete` only after the final commit, push, clean-tree and tag verification. Phase 3 is next.

## Phase 2.6 — Final calendar UX remediation and definitive Phase 2 sign-off

### 2026-09-12 — Independent audit and local subscription UX refinement

**Status:** local implementation complete; production deployment and final acceptance pending

**Audit:** confirmed the repository was clean on `main` at `phase-2.5-complete`, preserved that historical tag, and identified stale historical deployment wording that must remain separate from current-state documentation. The existing live Worker/D1/Access architecture remains the basis for the final pass.

**Implementation:** moved the subscription utility below the primary admin/student calendar content and replaced the always-visible card with a native `<details>/<summary>` disclosure closed on ordinary page loads. The expanded state contains a concise explanation, labeled private URL and copy control, explicit generation/regeneration action, restrained private-link warning and scannable Apple/Google/other iCalendar instructions. No migration, route, feed ownership or token behavior changed.

**Local validation:** `npm test`, `npm run build`, `npm run test:browser` and `git diff --check` passed. Fresh authenticated production visual acceptance, production deployment, complete feed regression, final documentation reconciliation, commit/push and `phase-2.6-complete` remain open.

## Phase 2.5 — Production calendar completion

### 2026-09-12 — Authenticated acceptance, cleanup and Phase 2 closure

**Status:** complete; Phase 2 closed

**Acceptance:**

- Fresh authenticated admin and student Chrome sessions verified the live calendar routes, week navigation, lesson links, creation handoff, read-only student view, subscription cards and role boundaries.
- Production feed checks verified valid `VCALENDAR`/`VEVENT` output, CRLF line endings, UTC instants, stable lesson UIDs, `CONFIRMED`/`CANCELLED` mapping, private/no-store/noindex headers, generic denial, `HEAD`, mutation denial, token rotation and old-token invalidation.
- Controlled lessons covered Europe/London, America/New_York, edit/change propagation, completion, cancellation and new-event propagation. Student feed output was ownership-filtered and omitted student names and private notes.
- Authenticated responsive checks at 1440px, 820px and 390px found no document overflow. Keyboard focus, labeled controls, headings, navigation labels and text status treatment were checked.
- The exact temporary student and lesson rows were deactivated and removed after the user confirmed the event in the subscribed calendar. The user's active admin feed identity was preserved; production D1 retains only the two intended active users and legitimate feed subscription state.
- Public-site regression and the full repository validation gates passed. The user confirmed that the real subscribed calendar displayed `Lesson - Calendar verification (temporary)` for 13 September at 10:00 Europe/London after refresh.

**Closure:** README, phase plan, agent instructions, changelog, architecture, deployment and testing documentation now agree that Phase 2 is complete. The `phase-2.5-complete` tag is created only after the final commit, push and clean-tree verification.

## Phase 2.5 — Production calendar completion

### 2026-09-12 — Production deployment and Access path configuration

**Status:** deployment complete; authenticated production acceptance and final Phase 2 closure pending

**Implementation and deployment:**

- Applied forward-only migration `0003_calendar_feeds.sql` to production D1 `foxtutor-learn`; the production schema now contains the hash-backed `calendar_feeds` table and active-owner index.
- Deployed the existing Phase 2.3/2.4 implementation as Worker version `56ab94cf-a035-4ec2-82b0-c5109299ebfa`.
- Created the narrowly scoped Cloudflare Access application `foxtutor.org/learn/calendar/feed/*` with `Bypass → Everyone`; the existing `foxtutor.org/learn` application and its Google allow policy were not changed.
- Verified direct invalid-token feed requests reach the Worker and return generic 404 responses with private/no-store/noindex protections, while normal Learn and malformed feed paths still redirect to interactive Access.

**Validation:** `npm test`; `npm run build`; `npm run check`; `npm run test:browser`; `npm run test:production`; remote migration/schema checks; Worker deployment inspection; direct production GET/HEAD and Access-boundary HTTP checks.

**Remaining gates:** fresh authenticated admin/student Chromium acceptance, controlled production lesson/feed fixtures, token rotation and live change-propagation checks, timezone/mobile/accessibility evidence, real Apple/Google subscription acceptance or a documented client limitation, fixture cleanup, final documentation reconciliation, commit/push and the `phase-2.5-complete` tag.

## Phase 2.4 — Live calendar subscriptions

### 2026-09-12 — Master local implementation: secure tokenized iCalendar feeds

**Status:** local implementation ready; deployment and production acceptance pending

**Implementation:**

- Added forward-only migration `0003_calendar_feeds.sql` for durable account-owned feed identities, hash-only opaque tokens, rotation metadata and revocation.
- Added admin and explicitly linked-student feed ownership resolution; student feeds cannot be selected by contact email or another student ID.
- Added live `GET /learn/calendar/feed/<opaque-token>` projection from current lessons with generic denial for invalid, malformed, revoked or non-read-only requests.
- Added RFC 5545-oriented output with `VCALENDAR`, stable lesson UIDs, UTC timestamps, `LAST-MODIFIED`, status mapping, approved HTTPS URLs, CRLF line endings, text escaping and 75-octet folding.
- Added a bounded feed range of 90 recent days plus 365 future days; no recurring or all-day events; private lesson notes are excluded.
- Added admin/student subscription UI with explicit bearer-link warning, intentional regeneration confirmation, copy-link behavior and concise Apple/Google URL instructions.

**Dependency decision:** no iCalendar dependency was added. The required output surface is small and is covered by focused tests for timestamps, UID stability, cancellation, escaping, folding and line endings.

**Tests:** `npm test`; `npm run build`; `npm run check`; `npm run test:browser`; `npm run test:production`; clean local D1 migration through `0003_calendar_feeds.sql`; actual Worker HTTP checks for admin/student isolation, generic denial, headers, live updates, cancellation, token rotation and subscription UI; `git diff --check`.

**Deployment:** not performed. Worker and remote D1 remain at the Phase 2.3 production state; migration `0003_calendar_feeds.sql` is local only. The existing `/learn/*` route still requires a narrowly scoped production Access exception for only `/learn/calendar/feed/*`; no broad Access weakening was made.

**Known limitations:** authenticated production acceptance, remote migration, Worker deployment, Cloudflare Access path verification, raw HTTP privacy/isolation checks, external Apple/Google subscription testing, controlled fixture cleanup and the `phase-2.4-complete` tag remain pending. External calendar applications control refresh timing; Learn cannot force immediate refresh.

**Next step:** run bounded local integration and deployment-preflight validation, then deploy only after the route-scope and migration review.

## Phase 2.3 — Calendar and scheduling UX

### 2026-09-12 — Local calendar implementation and query model

**Status:** local implementation ready; production and authenticated acceptance pending

**Implementation:**

- Added a reusable Monday-to-Sunday calendar-period helper with Europe/London display boundaries and existing UTC/IANA conversion functions.
- Added admin and student date-range lesson queries ordered by UTC start and ID; student queries retain the existing linked-user, active-record and role predicates and omit private notes/student names.
- Added server-rendered admin and student week calendar routes with previous, today and next navigation, clear period headings, empty-day states and explicit scheduled/completed/cancelled labels.
- Linked calendar lesson cards to the canonical lesson detail route and calendar day actions to the existing lesson creation form with prefilled date, time and timezone values.
- Added tablet/mobile stacked-day layout while preserving the established FoxTutor branding, focus styles, noindex shell and server-rendered architecture.
- Added unit coverage for date-range selection, timezone boundaries, lesson ordering, student ownership predicates, privacy columns and empty query results.

**Tests:** `npm test` (9 files, 23 tests); `npm run build`; `npm run check`; `npm run test:browser`; `git diff --check`.

**Deployment:** not performed. The production Worker remains `85129275-02b5-40be-8626-db554aa6903f`; no production D1 migration was required.

**Known limitations:** authenticated Chromium acceptance, production overlap/timezone/privacy verification, public regression after deployment, controlled fixture cleanup and the `phase-2.3-complete` tag are not claimed.

**Next step:** review and deploy the local calendar implementation through the bounded Phase 2.3 acceptance passes without starting recurrence, availability, notifications, resources or billing.

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

## Phase 1.2 — Remediation and capability reconciliation

### 2026-09-12 — Local D1, route safety and mail contract remediation

**Status:** blocked by genuine external Cloudflare control-plane permissions; production remains unactivated

**Implementation:**

- Executed `0001_foundation.sql` against a fresh local Wrangler D1 persistence directory and queried the resulting users/sessions schema and indexes.
- Exercised the local Worker against real local D1 with unauthenticated, admin, student and student-to-admin denial cases.
- Narrowed production routing to exact `foxtutor.org/learn` and `foxtutor.org/learn/*` patterns and moved Learn assets below `/learn/assets/`.
- Preserved production-only `Secure` cookies while allowing local HTTP smoke tests to use the real session flow.
- Aligned the mail adapter with Fox Mail's documented `/internal/api/v1/messages/send` contract, bearer token, idempotency key, explicit `from` identity and optional Access Service Auth headers.
- Rechecked the public homepage, `robots.txt` and sitemap; status, content type and stored body hashes remained unchanged.
- Audited Wrangler and direct Cloudflare REST access. Account, zone, Worker and Access collection reads work; D1, R2, route writes and Access writes remain permission-blocked.

**Tests run:** `npm test`, `npm run build`, `npm run check`, `npm run test:browser`, fresh local D1 migration/schema inspection and local Worker/D1 HTTP smoke requests.

**Deployment:** no production route or Access policy was changed. No production D1 migration, authenticated browser flow or real mail send was claimed.

**Known limitations:** a token with D1 edit, Workers Routes edit and Zero Trust Access edit permissions is required to activate production safely. See `docs/handover/phase-1.md`.

## Phase 1.3 — Capability reconciliation

### 2026-09-12 — Reconcile all available Cloudflare authentication mechanisms

**Status:** genuine human blocker remains for Zero Trust Access writes; production remains unactivated

**Implementation/evidence:**

- Confirmed the environment exposes one active `CLOUDFLARE_API_TOKEN`; Wrangler uses it when present, and its token metadata listing is not accessible.
- Discovered and tested the existing local Wrangler OAuth session without changing production state. `npx wrangler whoami` reports the Foxlearningltd account and relevant `workers_scripts:write`, `workers_routes:write` and `d1:write` scopes.
- Confirmed the OAuth mechanism can read the account, zone, Workers, D1, Workers Routes and R2; non-mutating invalid-payload validations authorize Worker deployment, D1 create and route write requests.
- Established the resource inventory: four existing Workers but no `foxtutor-learn`; two unrelated D1 databases but no `foxtutor-learn`; zero Workers Routes; two R2 buckets; and empty Access applications, identity providers and policies.
- Confirmed Access application and identity-provider write validation remains forbidden (`HTTP 403`, `auth.forbidden`, error `1010`) through the existing OAuth mechanism. No alternate environment, CI or project credential path was exposed.
- Rechecked the public homepage, `robots.txt` and sitemap before and after discovery; stored body hashes remained unchanged.

**Tests/commands:** direct sanitized REST probes using both credential mechanisms; `npx wrangler whoami`; `npx wrangler d1 list --json`; `npx wrangler r2 bucket list`; `env -u CLOUDFLARE_API_TOKEN npx wrangler deploy --dry-run`; local regression suite documented below.

**Deployment:** none. No production Worker, D1, route, Access application/policy, DNS record or mail delivery was changed.

**Handover:** make an existing Cloudflare credential with Zero Trust Access application, identity-provider and policy write permissions available to the runtime. Create a new credential only if no existing authorized mechanism exists. See `docs/evidence/phase-1/cloudflare-capability-check.txt` and `docs/handover/phase-1.md`.

## Phase 1.4 — Production activation preflight

### 2026-09-12 — Verify the intended production credential before mutation

**Status:** blocked; production remains unactivated

**Verification:**

- The only exposed `CLOUDFLARE_API_TOKEN` authenticated to the intended Foxlearningltd account and `foxtutor.org` zone.
- Account, zone, Worker and Access collection reads passed.
- D1, Workers Routes and R2 reads remained blocked.
- Safe invalid-payload probes for Access application and identity-provider writes returned HTTP 403, `auth.forbidden`, error `1010`.
- Wrangler reported missing user details and membership permissions for the exposed API token.
- The existing Wrangler OAuth session remains able to validate Worker, D1 and Workers Routes operations but does not provide the required Access write boundary.

**Production result:** no D1, Worker, route, Access, DNS, public-site or mail mutation was performed. The exact sanitized results are recorded in `docs/evidence/phase-1/phase-1.4-credential-check.txt`.

**Handover:** expose the existing Access-write-capable `foxtutor build token` through the runtime without creating, rolling or recording another credential. Do not begin production mutation until the Access application and identity-provider write probes authorize.

### 2026-09-12 — Runtime recheck after credential handover

**Status:** blocked before production mutation

**Verification:**

- Rechecked the runtime `CLOUDFLARE_API_TOKEN` without recording its value; it remains the previously blocked API-token mechanism rather than the intended Access-write-capable credential.
- Confirmed account, zone, Worker and Access collection reads.
- Confirmed D1, Workers Routes, R2 and Worker deployment operations remain authentication-blocked.
- Confirmed invalid-payload writes for Access applications, identity providers and policies remain forbidden (`HTTP 403`, `auth.forbidden`, error `1010`).
- Confirmed the separate Wrangler OAuth profile still lacks Access write capability and was not used for production mutation.
- Re-ran the public-site baseline and `npm run test:production`; public resources remain at their recorded hashes, while `/learn` remains the known public-site fall-through until the route and Access perimeter are activated.

**Production result:** no Worker, D1 database, route, Access resource, DNS record, mail message or public-site resource was created or changed.

**Evidence:** `docs/evidence/phase-1/phase-1.4-credential-check.txt`.

### 2026-09-12 — Runtime capability recheck and malformed-cookie hardening

**Status:** blocked; production remains unactivated

**Implementation/evidence:**

- Re-ran the account capability matrix with the credential exposed to this
  terminal. Wrangler still identifies it as the blocked User API Token rather
  than the intended Access-write-capable account token.
- Confirmed account, zone, Worker and Access reads, while D1, Workers Routes,
  R2, Worker deployment and Access application/identity-provider/policy writes
  remain blocked with the previously recorded HTTP 401/403 errors.
- Confirmed the existing Wrangler OAuth session can dry-run the Worker and
  inventory unrelated D1 databases but cannot write Access configuration.
- Hardened malformed cookie parsing so invalid percent-encoding fails closed
  without throwing before application authorization.
- Rechecked the public homepage, `robots.txt` and `sitemap.xml`; current body
  hashes match the stored baseline.

**Tests:** `npm test` (6 files, 12 tests), `npm run build`, `npm run check`,
`npm run test:browser`, `npm run test:production` (expected private-route
failure while production is inactive), direct public hash comparison.

**Deployment:** none. No production Worker, D1, route, Access resource, mail
message, DNS record or public-site resource was changed.

**Handover:** expose the existing `foxtutor build token` through
`CLOUDFLARE_API_TOKEN` or another authorized runtime path. Do not create,
rotate, replace or record a new token. See
`docs/evidence/phase-1/phase-1.4-credential-check.txt`.

## Phase 1.5 — Learn production activation

### 2026-09-12 — Deploy isolated Learn production foundation

**Status:** deployed; Phase 1 acceptance remains pending authenticated browser and mail evidence

**Production resources:**

- Worker `foxtutor-learn`, version `24b3ab69-ed6c-4721-aad3-8eda0a99fba7`.
- D1 `foxtutor-learn`, UUID `204dadc5-46ff-41b7-9da1-049f85d29422`.
- Remote `0001_foundation.sql` migration applied successfully.
- Routes `foxtutor.org/learn` and `foxtutor.org/learn/*` only.
- Access app `FoxTutor Learn`, ID `13a98192-7cbc-4a2c-bf2f-d4a4e1d2d70b`.
- Access policy `FoxTutor Learn Controlled Users`, ID `4f444ffd-503f-467e-b6e6-8914508f89fc`.
- Existing Google IdP reused; existing Mail and EDInterval Access resources were not modified.

**Controlled data:** seeded only `foxlearningltd@gmail.com` as `ADMIN` and `student.test@foxtutor.org` as `STUDENT`.

**Verification:** local test/build/check/browser suites passed; production smoke passed; D1 schema and route inventory passed; `/learn` reaches the Google Access boundary; public homepage, robots, sitemap and representative public route remained unchanged.

**Remaining limitations:** authenticated admin/student/unknown Chromium flows require controlled Google credentials, and the Fox Mail production adapter requires an `INTERNAL_API_TOKEN` plus a controlled destination for delivery/idempotency verification. No `phase-1-complete` tag was created.

## Phase 1.6 — Acceptance and closure preflight

### 2026-09-12 — Reconcile controlled identity and verify remaining acceptance boundaries

**Status:** blocked at explicit human checkpoints; completion tag not created

**Completed:**

- Verified the live Learn boundary, Worker deployment, production D1, exact routes and existing Learn Access application without recreating Phase 1.5 resources.
- Updated the production D1 student record from `student.test@foxtutor.org` to `jamesanf@gmail.com` with a guarded role/status/email predicate; the admin remained unchanged.
- Confirmed the final desired D1 users are `foxlearningltd@gmail.com` (`ADMIN`, `ACTIVE`) and `jamesanf@gmail.com` (`STUDENT`, `ACTIVE`).
- Inspected Fox Mail’s authoritative internal API contract. It requires the Fox Mail `INTERNAL_API_TOKEN`; its production secret inventory currently does not contain that secret, and the endpoint still returns the interactive Cloudflare Access boundary to unauthenticated machine requests.
- Re-ran `npm test`, `npm run build`, `npm run check`, `npm run test:browser` and `npm run test:production`; all passed.
- Rechecked `/`, `/robots.txt`, `/sitemap.xml` and `/about`; public body hashes remain equal to the stored baseline, and `/learn` remains an Access redirect rather than public-site fall-through.

**Outstanding human actions:** expose the existing Access-write-capable Learn credential so the Learn policy can replace `student.test@foxtutor.org` with `jamesanf@gmail.com`; configure Fox Mail’s existing machine-auth boundary and provide the required Learn Worker secret bindings without exposing values; then complete the three clean-profile Google browser checkpoints and one controlled Fox Mail send plus exact-key replay. No `phase-1-complete` tag or completion claim is permitted before those gates pass.

### 2026-09-12 — Acceptance recheck and explicit handover confirmation

**Status:** blocked; no completion tag created

**Verification:**

- Re-ran `npm test`, `npm run build`, `npm run check`, `npm run test:browser`
  and `npm run test:production`; all passed.
- Queried production D1 through the existing Wrangler OAuth session and
  confirmed exactly `foxlearningltd@gmail.com` as `ADMIN`/`ACTIVE` and
  `jamesanf@gmail.com` as `STUDENT`/`ACTIVE`.
- Rechecked the public homepage, `robots.txt`, sitemap and `/about`; the
  homepage, robots and sitemap hashes still match the stored baseline.
- Rechecked `/learn` with a Googlebot user agent; it reaches the Cloudflare
  Access login boundary and does not fall through to the public homepage.
- Rechecked Learn and Fox Mail Worker secret inventories without printing
  values. Learn has no mail secret bindings; Fox Mail has no
  `INTERNAL_API_TOKEN` secret.

**Handover:** the runtime still lacks Access policy write capability, the Fox
Mail bearer secret and a non-interactive Fox Mail Access Service Auth path.
Authenticated Chromium role/denial/noindex evidence and controlled Fox Mail
delivery/idempotency evidence remain unproven. See
`docs/handover/phase-1.md` and
`docs/evidence/phase-1/phase-1.6-acceptance-preflight.txt`.

### 2026-09-12 — Phase 1.6 authenticated acceptance evidence

**Status:** blocked only by Fox Mail production machine authentication; no completion tag created

**Completed:**

- Reconciled the existing `FoxTutor Learn` Access policy in place so only
  `foxlearningltd@gmail.com` and `jamesanf@gmail.com` are allowed.
- Verified production D1 contains exactly those active admin/student records;
  the temporary student identity is not active.
- Completed separate clean-profile Chromium checks for the admin shell, student
  shell, student-to-admin server denial and unknown-identity Access denial.
- Verified authenticated admin noindex metadata and `X-Robots-Tag`, session
  persistence after refresh, Secure/HttpOnly/Strict cookie attributes and
  absence of authentication tokens in localStorage.
- Verified exact Learn routes still target only `foxtutor-learn`; public
  homepage, robots, sitemap and `/about` regression checks remain unchanged.

**Tests:** `npm test`, `npm run build`, `npm run check`,
`npm run test:browser`, `npm run test:production`.

**Fox Mail result:** source and configuration inspection confirm the internal
endpoint requires `INTERNAL_API_TOKEN` and a non-interactive Access Service
Auth path. The Fox Mail production secret inventory has no
`INTERNAL_API_TOKEN`; the endpoint returns the interactive Access redirect.
No delivery or idempotency result was claimed.

**Handover:** restore/configure Fox Mail's existing machine-auth boundary and
provide the required Learn Worker secret bindings without exposing values.
Then run exactly one controlled send and exact-key replay before committing,
tagging and pushing Phase 1 completion.

## Phase 2.1 — Student and lesson management

### 2026-09-12 — Implement the first tutoring-management domain

**Status:** implemented and deployed; authenticated production acceptance pending

**Implementation:**

- Added forward-only `0002_students_lessons.sql` with explicit student-to-Learn-user linking, active/inactive student state, lesson foreign keys, lifecycle constraints and targeted indexes.
- Added admin student list/create/read/edit/deactivate flows and explicit optional linking to an existing active `STUDENT` Learn account.
- Added admin lesson list/create/read/edit/status flows with server-side validation, private plain-text notes, HTTPS external lesson URLs, UTC instant plus IANA timezone storage and deterministic overlap rejection.
- Added student chronological upcoming/past/cancelled lesson views and SQL ownership predicates that resolve the authenticated Learn user before returning lesson data.
- Preserved the existing Access identity, server-side session, CSRF, role authorization, private headers, noindex metadata, public-site route boundary and Fox Mail adapter.

**Tests/evidence:** baseline and Phase 2.1 `npm test`, `npm run build`, clean local D1 migration/schema inspection, local HTTP authentication/CRUD/ownership smoke and `git diff --check`.

**Deployment:** migration `0002_students_lessons.sql` was applied to the existing production `foxtutor-learn` D1 and final Worker version `3a81dca9-539e-4e42-8c6a-1bc058902fe2` was deployed. Public routes, Access configuration, Fox Mail and public-site infrastructure were not changed.

**Known limitations:** no calendar UI, recurring lessons, availability, notifications, resources, billing or reporting; authenticated Phase 2.1 acceptance still requires the controlled existing identities.

## Phase 2.2 — Production acceptance, visual hardening and operational closure

### 2026-09-12 — Pass 1 visual hierarchy correction

**Status:** deployed; authenticated production acceptance remains pending

**Implementation:**

- Applied the established public FoxTutor action blue (`#0e7490`) to the Learn top bar and browser theme color while preserving the existing FoxTutor logo.
- Increased contrast between the application background, navigation, content surfaces, cards, tables, forms, controls and status badges.
- Added explicit active navigation styling, including a mobile-safe active indicator, through the existing Learn asset script.
- Preserved reduced-motion, keyboard-focus, noindex and private response behavior; no data, authorization or lesson lifecycle logic changed.

**Tests:** `npm test`, `npm run build`, `npm run check`, `npm run test:browser`, `npm run test:production`, `git diff --check`, live public-site status checks.

**Deployment:** Worker version `85129275-02b5-40be-8626-db554aa6903f` deployed successfully. `/learn` remains behind the existing Cloudflare Access redirect. Public homepage, `/about`, `/robots.txt` and `/sitemap.xml` remained available and unchanged; Learn remains absent from the public sitemap.

**Known limitations:** authenticated Chromium visual/CRUD inspection, student privacy/isolation, controlled fixture cleanup and final Phase 2.1 closure remain for subsequent bounded passes. Headless Chrome capture was attempted locally but did not complete reliably in this environment.

**Next pass:** Pass 2 — authenticated admin production acceptance with `foxlearningltd@gmail.com`.

### 2026-09-12 — Pass 2 authenticated admin production acceptance

**Status:** PASS; student/privacy acceptance remains pending

**Production acceptance completed in a fresh authenticated Chromium session as `foxlearningltd@gmail.com`:**

- Created, viewed, edited and deactivated a controlled student record.
- Created explicit linked Student A (`jamesanf@gmail.com`) and unlinked Student B fixtures for the next privacy pass.
- Created and viewed a scheduled lesson, edited its notes and HTTPS external URL, and confirmed both persisted in the admin response.
- Changed the lesson from scheduled to completed and confirmed the resulting status in the lesson detail response.
- Confirmed the production admin dashboard rendered the blue theme color and active Dashboard navigation state.

**Controlled fixtures retained for Pass 3:** Student A, Student B and one completed lesson. No real pupil data was used.

**Tests/evidence:** authenticated browser-session HTTP/HTML acceptance against production; no application source changes were required after Pass 1.

**Deployment:** unchanged at Worker version `85129275-02b5-40be-8626-db554aa6903f`; no new deployment was needed.

**Next pass:** Pass 3 — authenticated student access, cross-student isolation, student-to-admin denial and private-response inspection with `jamesanf@gmail.com`.

### 2026-09-12 — Pass 3 authenticated student and privacy acceptance

**Status:** PASS; responsive/accessibility acceptance remains pending

**Production acceptance completed in a separate authenticated Chromium session as `jamesanf@gmail.com`:**

- Confirmed the explicitly linked Student A account sees its completed lesson in the Past section and can open its own lesson detail.
- Confirmed the unlinked Student B record and Student B lesson are absent from the student schedule response.
- Confirmed admin notes are absent from both the student lesson-list and own-lesson detail HTML responses.
- Requested Student B’s lesson directly by ID and received `404` with no Student B name, URL or note in the response.
- Requested `/learn/admin`, `/learn/admin/students` and `/learn/admin/lessons` directly and received `403` responses without admin data.
- Confirmed private noindex metadata and `X-Robots-Tag` remained present on the student response.

**Controlled fixtures retained for Pass 4/5:** CRUD fixture (inactive), Student A linked to `jamesanf@gmail.com`, Student B unlinked, one completed Student A lesson and one scheduled Student B lesson.

**Tests/evidence:** authenticated browser-session HTTP/HTML acceptance against production; direct response-body inspection; no application source changes were required after Pass 1.

**Deployment:** unchanged at Worker version `85129275-02b5-40be-8626-db554aa6903f`; no new deployment was needed.

**Next pass:** Pass 4 — authenticated desktop, tablet and mobile responsive/accessibility acceptance.

### 2026-09-12 — Pass 4 authenticated responsive and accessibility acceptance

**Status:** PASS; final regression and cleanup remain pending

**Production acceptance completed in authenticated Chromium sessions:**

- Checked student dashboard, lesson list and lesson detail at desktop (1440px), tablet (820px) and mobile (390px) widths.
- Checked admin dashboard, student list/form and lesson list/form/detail at the same three widths.
- Confirmed no document-level horizontal clipping and that all rendered buttons, inputs, selects, textareas and links fit their viewport.
- Confirmed mobile navigation is contained in its own horizontal navigation surface, with active navigation visible.
- Confirmed screenshots of the mobile admin lesson form and student lesson list show the blue FoxTutor top bar, grounded background, readable surfaces, responsive table cards and usable controls.

**Tests/evidence:** authenticated Chromium layout metrics and screenshots across desktop/tablet/mobile; existing focus-visible and reduced-motion CSS contract remained present.

**Deployment:** unchanged at Worker version `85129275-02b5-40be-8626-db554aa6903f`; no new deployment was needed.

**Next pass:** Pass 5 — final regression, lifecycle/timezone/overlap checks, controlled fixture cleanup and closure decision.

### 2026-09-12 — Pass 5 final regression, cleanup and Phase 2.1 closure

**Status:** COMPLETE; `phase-2.1-complete` created after this documentation commit

**Final acceptance:**

- Re-ran `npm test`, `npm run build`, `npm run check`, `npm run test:browser` and `npm run test:production`; all passed.
- Rechecked public `/`, `/about`, `/robots.txt` and `/sitemap.xml` (all 200), confirmed `/learn` remains a 302 Cloudflare Access boundary, and confirmed the public repository was not modified by this work.
- Verified authenticated post-cleanup admin and student responses contain no Phase 2.2 fixture data.
- Verified Europe/London and America/New_York timezone display under an overridden browser timezone, overlap rejection and non-overlap acceptance, scheduled/completed/cancelled lifecycle behavior, invalid lifecycle transition rejection and student lifecycle immutability.
- Deactivated controlled students and cancelled scheduled controlled lessons through the authenticated admin mechanisms, then removed only the exact controlled fixture IDs with guarded production D1 cleanup. Final D1 contains only `foxlearningltd@gmail.com` (`ADMIN`, `ACTIVE`) and `jamesanf@gmail.com` (`STUDENT`, `ACTIVE`); production migrations are `0001_foundation.sql` and `0002_students_lessons.sql`.

**Production:** Worker version `85129275-02b5-40be-8626-db554aa6903f` remains current; no new application deployment was required after Pass 1.

**Closure decision:** all required visual, authorization, privacy, responsive, lifecycle, timezone, overlap, regression, cleanup, documentation, Git and deployment gates passed. Phase 2.1 is closed. Calendar, availability, recurrence, notifications, resources, billing and reporting remain deferred.
