# Foxtutor Learn Platform — Master Phased Build Plan

## Purpose

Build a small, private, lesson-centric pupil portal for a sole tutoring practice. The platform is intended to reduce administration rather than reproduce a marketplace.

The application must remain deliberately small, auditable, maintainable, and Cloudflare-native.

## Core design principles

1. Private, invite-only access.
2. Google/Cloudflare identity rather than application passwords for V1.
3. One application at `/learn`, with role-based teacher/admin and student areas.
4. One primary domain/application boundary rather than two separate deployments.
5. Lesson is the central business object.
6. Student access is limited to their own data.
7. Homework/resources belong to lessons, not to an unrestricted student drive.
8. R2 is object storage; document processing is an explicit pipeline around it.
9. PDF compression occurs automatically when required, without asking pupils to use third-party websites manually.
10. Resource retention is normally at least 12 months, with explicit administrative deletion controls.
11. Accounting remains external; FreeAgent/GoCardless are integration boundaries, not application subsystems.
12. Email is delegated to the existing `mail.foxtutor.org` API.
13. No public registration, marketplace, matching, ranking, tutor profiles, or platform billing system.
14. Every meaningful change must be tested, documented, committed, pushed, and deployed according to the project state.
15. Every phase must leave the repository in a coherent, runnable state.

## Proposed platform shape

```text
foxtutor.org
  public React marketing site

foxtutor.org/learn
  private Learn application
      |
      +-- Cloudflare Access / Google identity
      |
      +-- Cloudflare Worker
      |      +-- application API
      |      +-- authorization
      |      +-- notification orchestration
      |      +-- document-processing orchestration
      |      +-- FreeAgent adapter
      |
      +-- D1
      |      +-- users/students
      |      +-- lessons
      |      +-- resources metadata
      |      +-- cancellations
      |      +-- notifications
      |      +-- integration state
      |
      +-- R2
      |      +-- private lesson resources
      |
      +-- mail.foxtutor.org
      |      +-- Gmail/Brevo provider abstraction
      |
      +-- FreeAgent (later phase)
```

## Phase 0 — Project constitution, repository foundation, and specifications

### Objective

Create the repository structure, project brief, architecture record, test strategy, security/privacy rules, agent operating rules, and initial application skeleton before any production exposure.

### Must achieve

- Establish repository and default branch.
- Create authoritative README with project map and current state.
- Create `docs/` with architecture, data model, security/privacy, operations, retention, testing, decisions, and changelog material.
- Establish a single source of truth for the phase plan.
- Establish an explicit definition of done.
- Establish test commands and CI expectations.
- Establish coding-agent workflow and required handovers.
- Establish no-Google-indexing requirement before any deployment.
- Define environment naming: local, preview/staging if used, production.
- Define secrets strategy and prohibit credentials in git.

### Repository structure to establish

```text
/
├── README.md
├── docs/
│   ├── AGENT_INSTRUCTION.md
│   ├── CHANGELOG.md
│   ├── PHASE_PLAN.md
│   └── PROJECT_STRUCTURE.md
├── package.json
├── wrangler.toml / wrangler.jsonc
├── src/
│   ├── worker/
│   ├── auth/
│   ├── db/
│   ├── lessons/
│   ├── resources/
│   ├── notifications/
│   └── integrations/
├── public/
│   └── app/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── security/
│   ├── browser/
│   └── fixtures/
├── migrations/
├── scripts/
├── docs/
│   ├── architecture.md
│   ├── domain-model.md
│   ├── authentication.md
│   ├── security-and-privacy.md
│   ├── data-retention.md
│   ├── storage-and-documents.md
│   ├── notifications.md
│   ├── integrations.md
│   ├── testing.md
│   ├── operations.md
│   ├── decisions.md
│   ├── deployment.md
│   ├── human-handoffs.md
│   └── phases/
└── agent-work/
    └── task-log.md
```

### Tests

- Repository installs from clean checkout.
- Type-check/build/test commands exist and run, even if initial suites are mostly smoke tests.
- Secret scanning catches obvious credentials.
- Git status is clean at phase completion.
- No private application URL is linked from the public site.

### Exit criteria

A new agent can clone the repository, read the README and agent guide, run the documented commands, understand the architecture, and identify the current phase without conversational context.

---

## Phase 1 — Private application shell, Google authentication, authorization, and indexing prevention

### Objective

Create the first live Cloudflare deployment of the private `/learn` application. This phase establishes the security perimeter and proves the application can distinguish teacher/admin from student identities.

### Must achieve

- Deploy private `/learn` application to production.
- Put Cloudflare Access in front of `/learn`.
- Configure Google identity provider.
- Establish invite-only user records.
- Map authenticated identity/email to local application user.
- Establish server-side roles: `ADMIN` and `STUDENT`.
- Deny authenticated but unprovisioned users at the application layer.
- Establish secure session handling where needed beyond Access.
- Ensure every private route performs authorization.
- Establish CSRF protections for state-changing requests if applicable to chosen session architecture.
- Establish secure cookie policy if application sessions are used.
- Keep public site unaffected.
- Make `/learn` visually separate from public marketing site while using the same overall brand.

### Google non-indexing requirements

Before production exposure, implement and test all applicable layers:

- Cloudflare Access/authentication gate before application content.
- `X-Robots-Tag: noindex, nofollow, noarchive` on private application responses.
- `<meta name="robots" content="noindex,nofollow,noarchive">` on rendered pages.
- `robots.txt` disallowing `/learn` as a defence-in-depth measure.
- No private routes in public sitemap.
- No public internal links to student/admin routes unless intentionally gated.
- No sensitive content rendered to unauthenticated requests.
- Confirm Googlebot/user-agent requests are denied by the authentication perimeter.
- Confirm direct navigation to a guessed private route does not reveal content.

### Tests

#### Authentication tests

- New unprovisioned Google account is denied.
- Provisioned student can enter student dashboard.
- Admin can enter admin area.
- Student cannot enter admin routes.
- Student cannot access another student's route/data by URL manipulation.
- Logout/Access sign-out behaves correctly.

#### Privacy/indexing tests

- `curl` unauthenticated to `/learn` receives Access/auth denial.
- `curl` unauthenticated to `/learn/admin/...` receives Access/auth denial.
- Googlebot user-agent receives the same protection.
- Private responses contain appropriate `X-Robots-Tag`.
- Rendered private pages contain appropriate robots meta.
- Public sitemap contains no private paths.
- Public homepage contains no unintended crawl path to `/learn`.
- Search Console-compatible inspection of public pages shows no private URLs are advertised.

#### Authorization tests

- Every data query is scoped to current user/role.
- A student cannot obtain another student's lesson ID data.
- Direct object URLs do not bypass authorization.

### Exit criteria

The application is live but contains no substantive pupil data. Authentication and authorization are proven in production. A human can create a test student, log in as that student, and confirm that private data is inaccessible to Google and unauthorized users.

### Phase 1.1 execution state — 2026-09-12

The Worker shell, authorization/session foundation, noindex policy, D1 migration, mail boundary, tests, public-site baseline capture and deployment configuration are implemented in this repository. The phase remains **blocked, not complete**, because the available Cloudflare token cannot access D1, Workers Routes, Zero Trust Access, R2 or Pages APIs. A human with the required permissions must complete the actions in `docs/handover/phase-1.md`, after which a remediation pass (Phase 1.2) must run the production browser and smoke matrix before the phase can be tagged complete.

## Phase 1.2 execution state — 2026-09-12

Phase 1.2 completed the remediation work that is possible with the available credentials: a clean local D1 migration was executed and inspected; the local Worker was exercised against real D1 with admin/student/unauthenticated cases; the Learn route was narrowed to exact `/learn` and `/learn/*` patterns; Learn assets were moved below `/learn/assets/`; the Fox Mail adapter was aligned with the real internal API contract; and the public homepage, robots and sitemap were rechecked unchanged.

The phase remains **blocked, not complete**. Direct REST and Wrangler checks show account/zone/Worker reads work, but remote D1, Workers Route writes, Access writes, R2 access and the required Google/Access configuration are unavailable to the current token. No production D1 migration, live route, Access policy, authenticated browser flow or real mail send was claimed.

## Phase 1.3 execution state — 2026-09-12

Phase 1.3 reconciled all Cloudflare authentication mechanisms exposed to the runtime. `CLOUDFLARE_API_TOKEN` is active but lacks D1, Workers Routes, R2 and Worker deployment permissions. The existing Wrangler OAuth session is active for Worker scripts, D1, Workers Routes and R2 reads; direct resource probes and non-mutating invalid-payload write validations confirmed those capabilities without creating state.

The OAuth-backed inventory is now known: the account has four existing Workers but no `foxtutor-learn` Worker, two unrelated D1 databases but no `foxtutor-learn` database, zero Workers Routes, two R2 buckets, and empty Access application, identity-provider and policy collections. Access application and identity-provider writes return HTTP 403 with `auth.forbidden` error `1010` for the OAuth session. Phase 1 remains **not complete** and has a genuine human blocker limited to an existing Access-write-capable credential or equivalent authenticated mechanism. No production resource, route, Access configuration, DNS record or mail delivery was changed.

## Phase 1.4 execution state — 2026-09-12

The production activation recheck confirmed that the runtime still exposes the previously blocked user API token rather than the stated Access-write-capable account token. Account, zone, Worker and Access collection reads pass, but D1, Workers Routes, R2 and Worker deployment requests remain authentication-blocked; Access application, identity-provider and policy write validations remain forbidden with HTTP 403, `auth.forbidden`, error 1010. The existing Wrangler OAuth session can validate Worker, D1 and route operations but still lacks Access writes.

The local suite passes after hardening malformed cookie parsing, and the current public homepage, `robots.txt` and `sitemap.xml` hashes match the stored baseline. No production resource, route, Access configuration, DNS record, mail delivery or public-site deployment was changed. Phase 1 remains **blocked, not complete**.

## Phase 1.5 execution state — 2026-09-12

The dedicated Learn credential was verified against account `aeab9f48fa9716273d02bfb3d530bddc`. Production activation completed for Learn-scoped infrastructure: D1 `foxtutor-learn` was created and migrated; controlled admin/student records were inserted; Worker `foxtutor-learn` was deployed; exact `/learn` and `/learn/*` routes were installed; and a new self-hosted Access application and policy were created using the existing Google identity provider. The public homepage, robots, sitemap and representative public route remained unchanged, and `/learn` now reaches the Access sign-in boundary instead of the public-site fall-through.

Local tests, production smoke, D1 schema verification, route verification and clean unauthenticated Chromium verification passed. Phase 1 remains **not complete** until controlled authenticated admin/student/unknown browser flows and a controlled Fox Mail delivery/idempotency test are performed with the required test identities and mail credentials.

## Phase 1.6 execution state — 2026-09-12

Phase 1.6 has completed the safe reconciliation work available without
rebuilding Phase 1.5: the production D1 student was changed from
`student.test@foxtutor.org` to `jamesanf@gmail.com`; the Learn Access policy now
contains only the final admin and student identities; exact routes and final
D1 users were verified; Fox Mail’s authoritative internal API and idempotency
contract were inspected; authenticated admin/student/denial/noindex/session
evidence was captured; and the complete local, build, Wrangler,
browser-contract and production-smoke commands passed.

The phase remains **blocked, not complete** because Fox Mail’s
`INTERNAL_API_TOKEN` is absent from its production Worker secret inventory and
the internal endpoint still requires a non-interactive Access Service Auth
path. No production delivery or idempotency result can be claimed, and no
completion tag may be created.

---

## Phase 2 — Student administration, lessons, calendar, and core domain

### Objective

Create the minimum useful tutoring-management application: teacher/admin can create students and lessons; students can see only their own lessons.

### Must achieve

- Student CRUD/invite workflow.
- Active/disabled/archived student status.
- Lesson creation/editing/deletion rules.
- Lesson statuses.
- Teacher notes vs student-visible notes.
- External lesson URL.
- Calendar day/week view.
- Upcoming/past lesson views.
- Timezone-safe storage and display.
- Conflict detection.
- Optional availability rules and exceptions.
- Optional recurring lesson series if included in V1 scope; otherwise explicitly defer.

### Core data concepts

- User
- Student relationship
- Lesson
- Availability rule
- Availability exception

### Tests

- Admin creates student.
- Student receives access through configured identity.
- Admin creates lesson.
- Student sees lesson.
- Student cannot see another student's lesson.
- Editing a lesson updates student view correctly.
- Cancelled lessons cease to present as upcoming.
- Timezone display is correct around daylight-saving transitions.
- Scheduling a conflicting lesson is rejected safely.
- Deleted/disabled student cannot access historical private resources unless policy explicitly permits it.

### Exit criteria

A real lesson can be created end-to-end and seen correctly by the intended pupil. No document processing, billing, or complex notification machinery is required yet.

---

## Phase 2.5 — Production calendar completion and Phase 2 closure

### Objective

Take the Phase 2.3 calendar UX and Phase 2.4 private iCalendar implementation through production deployment, narrow Access routing, authenticated acceptance, external calendar validation, cleanup and documentation reconciliation. This is a completion pass, not new product scope.

### Must achieve

- Deploy the existing admin and student calendar routes without creating a parallel lesson system.
- Apply `0003_calendar_feeds.sql` to production D1 and verify the expected table, constraints and indexes.
- Serve `/learn/calendar/feed/<opaque-token>` without interactive Access login while preserving bearer-token authorization and generic denial.
- Keep all other `/learn/*` routes behind the existing Google-backed Access application.
- Verify feed ownership, token hashing, rotation, old-token invalidation, stable UIDs, status mapping, UTC timestamps, timezone behavior and live change propagation.
- Verify subscription UI, responsive behavior, keyboard/focus behavior and privacy boundaries with fresh authenticated admin and student sessions.
- Test a real Apple or Google subscription where practical, documenting provider-controlled refresh timing.
- Remove controlled production fixtures and reconcile README, phase, architecture, deployment, security, testing and changelog records.

### Exit criteria

Production Worker, D1, Access configuration, authenticated UI, feed HTTP behavior, calendar-client behavior, regression evidence, cleanup, documentation and Git state all agree. Only then may `phase-2.5-complete` be created and Phase 2 be marked complete.

**Closure:** Phase 2.5 acceptance is complete. Direct production HTTP/ICS checks and a real subscribed-calendar refresh both passed; provider-specific refresh intervals remain outside Learn's control.

## Phase 2.6 — Final calendar UX remediation and definitive Phase 2 sign-off

### Objective

Perform the final independent closure pass after the historical Phase 2.5 production completion: make the subscription utility visually secondary to the calendar, re-audit the live source/database/Worker/Access/UI/feed chain, reconcile documentation and rerun all release gates. This is a remediation and sign-off pass, not a new feature phase.

### Current state

Complete. Both admin and student calendar pages render the calendar before a native, collapsed-by-default subscription disclosure with restrained warning styling and responsive URL/copy controls. No D1 migration or feed architecture change was introduced. Production deployment, fresh authenticated admin visual acceptance, inherited authenticated student regression evidence, complete automated checks, documentation reconciliation and Git release verification all passed.

### Must achieve

- Keep the calendar as the first visual priority on both role routes.
- Keep subscription closed by default and accessible by keyboard with visible focus.
- Preserve feed generation, ownership, token rotation/invalidation, stable UIDs, statuses, timezone behavior, no-store headers and Access path scope.
- Re-audit production, run the established automated gates, test responsive behavior at 1440px, 820px and 390px, and clean any controlled fixtures.
- Reconcile current-state documentation without rewriting historical Phase 2.5 records.
- Create `phase-2.6-complete` only after the production, QA, documentation and Git gates all pass.

### Exit criteria

The live calendar feels restrained and professional, the subscription remains a secondary optional utility, all Phase 2 security and feed regressions pass, documentation describes reality, `main` is clean and pushed, `phase-2.5-complete` remains intact, and `phase-2.6-complete` is created. Phase 2 is complete and Phase 3 is the next deferred feature-development phase.

## Phase 2.7 — Calendar UX replacement and final Phase 2 sign-off

### Objective

Replace the bespoke week-first calendar presentation with a polished Month-first calendar using a mature open-source dependency where appropriate, retain an optional Week view, preserve the existing lesson/feed/security architecture, and perform definitive final Phase 2 acceptance. This remediation became necessary after the Phase 2.6 UX review found that subscription hierarchy had improved while the core calendar still felt too bespoke and week-centric.

### Must achieve

- Evaluate FullCalendar Standard and compatible alternatives against package size, browser support, TypeScript, server-rendered integration, local Worker asset bundling, responsive behavior, accessibility, timezone behavior, licensing and maintenance.
- Use only locally bundled, MIT-licensed Standard functionality; do not use Premium/Scheduler packages, CDN assets, hosted services or a client-side framework.
- Make Month the default view on both admin and student calendar routes and keep Week as the only secondary view.
- Provide one integrated Previous/Today/Next/title/Month/Week toolbar with no duplicate navigation header.
- Remove repeated per-day Add lesson controls and empty-day action clutter while keeping the canonical admin lesson creation action and lesson links.
- Pass only already-authorized, minimal lesson event data to the browser; preserve server-side ownership and the existing UTC/IANA timezone model.
- Keep the subscription utility below the calendar and collapsed by default.
- Update README after dependency assessment, implementation, deployment and browser acceptance; add architecture and testing records.
- Run the full automated, browser, production, privacy, feed, Access, responsive and cleanup gates before creating `phase-2.7-complete`.

### Exit criteria

The live admin and student calendars open to a polished current Month view, Week switching and navigation work, lesson clicks and admin creation remain canonical, student ownership is intact, the calendar is usable at desktop/tablet/mobile widths, accessibility and timezone checks pass, the feed and Access boundaries are unchanged, documentation agrees, production matches the repository, `main` is clean and pushed, `phase-2.5-complete` and `phase-2.6-complete` remain intact, and only then is `phase-2.7-complete` created. Phase 2 may be marked COMPLETE only at that point.

## Phase 2.8 — Calendar and Lesson UX Refinement

### Objective

Refine the live Month/Week calendar and lesson-creation workflow after real browser review exposed excessive vertical density, weak navigation iconography, overlong subscription copy, browser-native confirmation UI and unnecessary lesson-form complexity. This remediation follows the Phase 2.7 implementation; it does not reopen or redesign the existing lessons, feed, ownership, timezone, D1, Access or public-site architecture.

### Must achieve

- Keep FullCalendar Standard locally bundled with the existing compatible package versions; Month remains the default and Week remains the only secondary view.
- Reduce calendar toolbar, title, cell, event and surrounding-wrapper density without making the grid cramped.
- Keep one integrated toolbar with compact Previous, Today, Next, current title and Month/Week controls; preserve accessible, coherent chevron iconography and period-aware labels.
- Remove non-functional calendar explanation copy and repeated Add lesson controls; retain one clear admin Add lesson action and canonical lesson routes.
- Keep subscription below the calendar and collapsed by default. When open, show only the private link, Copy, Generate/Generate new link, concise invalidation warning and internal success/confirmation UI. Browser-native `alert`, `confirm` and `prompt` are prohibited.
- Redesign standard lesson creation around Student, Date, Start and optional Lesson link. Offer 15-minute start increments, derive a 55-minute end from the UTC/timezone-aware instant, show the derived end, keep `Europe/London` as concise context and de-emphasize Notes behind secondary details.
- Preserve HTTPS URL validation, overlap protection, lifecycle rules, student ownership, authorization, UTC storage, IANA timezone handling and canonical edit/detail support.
- Verify desktop 1440px normal and 75% zoom, tablet 820px, mobile 390px, keyboard/focus behavior, admin/student privacy, feed/token regression, Access/public-site boundaries and production cleanup where deployment is available.
- Update README after every material pass and reconcile agent instructions, phase plan, changelog, architecture, testing and deployment records.

### Exit criteria

Phase 2.8 is complete only when the compact calendar and lesson workflow pass real authenticated admin/student browser acceptance at the required viewports, the internal subscription confirmation and success feedback are proven, the derived 55-minute/15-minute UK workflow and DST behavior are proven, all security/feed/Access/public-site regressions pass, production matches the repository, controlled data is cleaned up, documentation is accurate, `main` is clean and pushed, historical `phase-2.5-complete` and `phase-2.6-complete` tags remain intact, and only then is `phase-2.8-complete` created. Phase 2 remains open until this gate passes.

## Phase 2.9 — Proper UI Composition and Lesson-Time Workflow Correction

### Objective

Correct the remaining Phase 2 UX defects after the Phase 2.8 implementation demonstrated that reducing copy and adding controls was insufficient without proper layout composition. Establish a professionally designed calendar toolbar, subscription utility and lesson-creation form using conventional grids, columns, spacing, hierarchy and native controls.

### Must achieve

- Preserve Month-first FullCalendar Standard with Week secondary, server-authorized event projection and existing lesson/feed/security architecture.
- Render clearly visible, consistent inline SVG Previous/Next icons with accessible period-specific labels.
- Compose navigation, period title and Month/Week controls as one balanced toolbar with sensible spacing at desktop, 75% zoom, tablet and mobile widths.
- Keep the subscription disclosure closed by default and compose its open state as a small utility with a dedicated read-only link field, grouped actions, concise warning, internal confirmation and success feedback.
- Replace the create-lesson quarter-hour selector with a native 24-hour `input[type="time"]` using `step="900"`; keep server quarter-hour validation authoritative.
- Update the derived 55-minute End preview immediately from Start alone, including midnight crossover, while preserving UTC/IANA/DST persistence and overlap validation.
- Use a real responsive form grid: Student full width, Date/Start paired on desktop, derived duration/timezone grouped, Lesson link full width, Notes behind Additional details and aligned actions.
- Add automated UI contracts for time input, no 96-option selector, immediate date-independent preview, visible icons, confirmation markup and no browser-native dialogs.
- Update README, agent instructions, architecture, testing, deployment and changelog records after each material pass.

### Exit criteria

Phase 2.9 is complete only when the rendered admin and student interfaces pass authenticated browser acceptance at 1440px, 1440px/75% zoom, 820px and 390px; the calendar, subscription and create-lesson workflows are visually balanced and accessible; time and DST behavior, ownership, feed, Access and public-site regressions pass; controlled data is cleaned up; production matches the repository; documentation is reconciled; `main` is clean and pushed; historical tags remain intact; and only then is `phase-2.9-complete` created. Phase 2 remains open until this gate passes.

## Phase 2.10 — Final tutoring workflow and information-architecture refinement

### Purpose

Replace the oversized month-first calendar with a compact weekly timetable focused on the practical tutoring day, retain Month as a secondary overview, add a first-class upcoming Bookings view with server-side pagination, remove redundant dashboard navigation cards, simplify student identity/email entry, and perform the definitive end-to-end Phase 2 product acceptance.

This phase exists because repeated calendar and form refinements improved technical functionality but did not achieve the required professional UX. Its visual acceptance was superseded by Phase 2.11 after rendered review found an oversized Month layout and unreadable event text.

### Current release state

Phase 2.10 is deployed from commit `68ba651` as Worker version `56471854-7ff2-47bd-b9a0-70f488f0d029` at `2026-09-12T21:58:00.509Z`. Its local and public boundary gates pass, but rendered visual acceptance found blockers that are remediated by Phase 2.11. Do not create `phase-2.10-complete`.

### Must achieve

- Use FullCalendar Standard TimeGrid at the pinned compatible `6.1.21` release with Week as the default and Month as the only secondary view. Keep the MIT-licensed Standard boundary; no Premium Scheduler/resource features, hosted assets, framework wrapper or bespoke timetable engine.
- Focus the timetable on 09:00–21:00, open around 09:00, keep the hour and quarter-hour guidance readable, and use a compact viewport with evening lessons easy to inspect.
- Provide one coherent toolbar with visible Previous/Next icons, Today, current Week/Month title and a compact `Week | Month` switch. Do not add Day, List or Year views.
- Render concise event content inside event bounds, preserve existing status styling, canonical lesson links, overlap behavior and server-authorized event projection, and keep timezone as global/contextual information rather than repeated event text.
- Keep one Add lesson action and the existing secondary collapsed subscription utility.
- Add `/learn/admin/bookings` as an admin-only view over future scheduled `lessons`, ordered earliest first, excluding completed/cancelled rows, with server-side validated 12/24/48 pagination, safe invalid query handling and responsive mobile rows.
- Make Dashboard show upcoming bookings, next lesson and active-student summaries without a duplicate navigation-card grid. Keep the sidebar as the primary information architecture: Dashboard, Calendar, Bookings, Students, Lessons.
- Keep the student record UI to Name and one login/contact Email while preserving explicit active-STUDENT account linking, uniqueness and server-side ownership.
- Keep Create Lesson as Student, Date, 24-hour Start, immediate derived 55-minute End, Lesson link and secondary details; do not reintroduce a large time dropdown.
- Verify desktop, 75% zoom, tablet and mobile layout, keyboard/focus states, ownership/privacy, feed and Access boundaries, public-site regression, production parity, cleanup and documentation.

### Exit criteria

Phase 2.10 is not a closure gate. Phase 2.11 owns the remaining calendar visual, subscription composition and measurable browser acceptance requirements.

## Phase 2.11 — Definitive calendar UI remediation

### Objective

Remediate the failed Phase 2.10 acceptance process and implementation. Identify rendered geometry and computed-colour root causes, redesign Month/Week sizing and subscription composition, and make unreadable or oversized states fail automated browser contracts.

### Current release state

Phase 2.11 is deployed from commit `4b099f8` as Worker version `8f157d02-a729-4813-b017-2049371dec3c` at `2026-09-12T22:50:18.740Z`. Local visual contracts, public smoke, invalid-token feed denial and remote migration checks pass. Authenticated production browser acceptance and feed ownership isolation remain pending because no production Cloudflare Access/browser credential is available. Do not create `phase-2.11-complete`.

### Required outcomes

- FullCalendar Standard Month uses intrinsic natural rows with `fixedWeekCount: false`, `expandRows: false`, no internal vertical scrollbar and no giant fixed/clamp host height.
- Week remains operationally focused on 09:00–21:00, with compact intrinsic slot density and readable events.
- Every rendered Scheduled, Completed and Cancelled event has computed contrast of at least 4.5:1, and its text remains within event bounds.
- Real Chrome checks cover 1440x900, 1440x800, 1280x800, 1024x768, 820x1180, 390x844 and 1440x900 at 75% zoom where available.
- Subscription open state uses an intentional grid; hidden confirmation contributes no height; confirmation buttons remain separated and mobile-safe.
- Existing lesson routes, feed/token ownership, Access, D1 and public-site behavior remain unchanged.

### Exit criteria

Phase 2.11 is complete only when local full-suite/build/check/browser/production gates pass, real Chrome visual contracts and screenshots are recorded, production deployment and authenticated admin/student browser acceptance pass, feed/security/ownership/public regressions pass, documentation matches the deployed Worker, `main` is clean and pushed, and only then is `phase-2.11-complete` created.

## Phase 2.12 — Final tutoring workflow refinement

### Objective

Make the remaining lesson workflows immediately understandable without reopening the accepted calendar sizing design. Bookings is the upcoming scheduled list; Past Lessons is the historical list; both use one conventional server-side list, pagination and page-size model. Calendar subscription generation and regeneration are one-click actions.

### Required outcomes

- Admin navigation reads Dashboard, Calendar, Bookings, Past Lessons, Students.
- Bookings remains `/learn/admin/bookings`, filters scheduled lessons with `start_at > now`, and orders earliest first.
- Past Lessons remains `/learn/admin/lessons`, filters all non-upcoming lesson history, and orders newest first.
- Both lists share presentation, status/action rows, result count, accessible Previous/Next navigation and a bottom `Show per page` select with exactly 12/24/48.
- Invalid page/size parameters are safe, page-size changes reset to page 1, and the browser never receives the full history.
- Calendar subscription generation/regeneration performs the secure existing POST flow immediately, invalidates the old token, displays the new link and has no confirmation UI or duplicate action.
- Existing authorization, ownership, feed, D1, Access, student and public-site boundaries remain unchanged.
- Documentation, tests, deployment evidence and production verification are reconciled.

### Exit criteria

Phase 2.12 is complete only after local tests/build/checks, focused list/query/subscription tests, browser review at desktop/tablet/mobile widths, production deployment, authenticated production verification, feed invalidation verification, security/public regression, clean working tree, pushed release commit, and the `phase-2.12-complete` tag are all complete. The calendar receives regression checks only; no broad sizing or visual redesign is permitted.

### Current release state

The implementation is deployed from commit `167cfc297bb8b745bc530d0cea8c07c5d6cf2313` as Worker `9f2b7ebf-a37a-4711-a7b5-d6c233f72d20` at `2026-09-12T23:07:37.894Z`. Local tests/build/check/browser/public-smoke gates pass. Authenticated production browser, feed rotation and real-Chromium visual verification remain pending because no Chromium binary or debug endpoint is available in the current environment. Do not create `phase-2.12-complete` until those gates are run.

## Phase 3 — Lesson resources, R2, PDF/document processing, retention, and admin file manager

### Phase 3.1 current state — 2026-09-13

The master implementation adds `0004_resources.sql`, the private `RESOURCES_BUCKET` binding, dedicated production/local R2 buckets, server-authorized resource upload/download/delete routes, student and lesson resource views, controlled file validation, SHA-256/page-count metadata, idempotent upload rows and a 12-month retention review date. Production D1 migration, bucket creation and Worker deployment `dfebaca6-f1e4-4019-bb5a-37f92344c161` are complete. Authenticated admin/student acceptance remains pending; do not claim Phase 3.1 complete or create a completion tag before that gate passes.

### Phase 3.2 current state — 2026-09-13

The resource infrastructure remains the Phase 3.1 baseline. The Add Resource workflow now uses server-validated lesson/student context, a generic two-column metadata grid, a styled keyboard-accessible file dropzone, selected-file metadata, upload progress, recoverable errors and context-aware success navigation. Category is removed from application code, requests, filters, lists and detail views. The `category` column from `0004_resources.sql` is retained unused for schema compatibility; no destructive migration was created. Commit `74e9ddd266e69cee3c6bf6d1245f02d17572c755` is deployed as Worker `86417b0e-3656-4087-b787-a0c5cb1014f5`. Authenticated browser verification, controlled fixture cleanup and the `phase-3.2-complete` tag remain pending.

### Phase 3.3 current state — 2026-09-13

The admin resource manager now supports server-side filename/student search, active-student and student-dependent lesson filters, derived type and recent-added filters, compact sorting, filter-preserving pagination, page-scoped selection and bulk deletion. Row actions are accessible icon controls with explicit Open, Download, Details and Delete semantics; Open uses an authenticated new tab and Download forces an attachment response. Student and lesson resource surfaces retain read-only Open/Download access.

The hard per-file limit remains 25 MiB and a single configured 25 MiB active-resource allowance is enforced per lesson before upload. PDF compression is **DEFERRED WITH DOCUMENTED TECHNICAL REASON**: this Worker-only repository has no verified Cloudflare-native asynchronous private PDF processor or approved processing credentials, and a synchronous CPU-heavy or external public-document service would violate the privacy and execution-boundary requirements. Retention housekeeping is also deliberately **DEFERRED WITH DOCUMENTED OPERATIONAL DECISION**: `retention_until` records a review horizon, but active learning material is not automatically deleted. Student deactivation remains non-destructive and existing SQL ownership predicates prevent inactive students from accessing resources.

Local implementation gates are covered by the resource policy, migration, authorization and UI contracts. Commit `6bd0dca674608c11be4363ec3ee94522e397ca0b` is pushed to `origin/main` and deployed as Worker `foxtutor-learn` version `43cceb60-905e-4034-bc26-ad03dd9c811d` at `2026-09-13T00:23:40Z`; public smoke and the Cloudflare Access boundary pass. Authenticated production browser acceptance, controlled fixture cleanup, screenshots and any Phase 3 completion tag remain open.

### Phase 3.8 current state — 2026-09-13

The final UI/source pass normalizes the shared header identity centerline and gives Previous/Next and numbered pagination controls one compact, focus-visible control family. The existing server-rendered HTML, TypeScript no-reload interaction model, History API state, request cancellation, authorization and resource data model remain unchanged.

The final product-scope decisions are:

- **PDF compression — DEFERRED TO FUTURE PHASE.** No verified private asynchronous processing boundary is available in the current Worker-only repository.
- **Retention housekeeping — DEFERRED TO FUTURE PHASE.** `retention_until` remains a review horizon; automatic deletion is not part of Phase 3.

The closure matrix is therefore reconciled for those two scope items, but Phase 3 is not closed: populated second-page production evidence, genuine cross-student direct-object evidence, final authenticated Chromium screenshots and exact final deployment verification still require a persistent authenticated browser session. No `phase-3-complete` tag is permitted until those gates pass.

### Objective

Make the lesson the student's permanent learning record while preventing the application from becoming a general-purpose file drive.

### Must achieve

- Private R2 bucket/object namespace.
- Lesson-scoped object keys, e.g. `students/{studentId}/lessons/{lessonId}/resources/{resourceId}`.
- Database metadata separate from object storage.
- Allowed formats at minimum: PDF, DOC, DOCX.
- Hard per-file upload limit.
- Hard per-lesson storage limit (target 25 MB initially, configurable).
- Prefer smaller normal operating limit (target approximately 10 MB per lesson where practical).
- Separate teacher and student upload permissions.
- Short-lived authenticated download mechanism.
- Upload state machine: uploading, available, failed, deleted; compression processing is deferred with the PDF pipeline.
- PDF inspection.
- PDF compression decision recorded; implementation is deferred to a future phase.
- Clear user-facing upload progress; compression-specific progress is deferred with the PDF pipeline.
- Reject unsupported formats safely.
- Retention metadata, default at least 12 months for lesson resources.
- Retention housekeeping decision recorded; automated deletion is deferred to a future phase.
- Admin storage browser by student → lesson → file.
- File sizes, dates, types, and delete actions.
- Student deletion flow removes operational files while preserving external accounting records that are legally required elsewhere.

### PDF processing design

The document pipeline must not depend on students knowing third-party compression sites.

Preferred logical pipeline:

```text
Upload
  ↓
Validate type/size
  ↓
Temporary/private R2 staging
  ↓
If PDF exceeds threshold → PDF compression adapter
  ↓
Validate resulting file
  ↓
Enforce final lesson/file limits
  ↓
Persist final object + metadata
```

Heavy CPU work must not become a synchronous, fragile Worker request. Use an external processing service or an appropriate asynchronous processing mechanism if necessary.

### Tests

- PDF upload under threshold stores unchanged or safely normalised.
- Oversized PDF enters processing state.
- Successful compression results in final file under policy threshold when possible.
- Uncompressible PDF is rejected cleanly with actionable message.
- DOC/DOCX are accepted.
- Unsupported executable/archive formats are rejected.
- Corrupt files are rejected.
- Student can only download resources attached to their own lessons.
- Student cannot enumerate R2 object keys.
- R2 bucket is not public.
- Expired download URL no longer works.
- Deleted file is unavailable from both UI and storage.
- Lesson storage limit is enforced transactionally.
- Retention job deletes eligible resources and metadata.
- Admin can delete an individual file.
- Admin can delete all resources for a lesson.
- Admin can delete a student's operational resources.
- Student account deletion does not delete external accounting data.

### Exit criteria

Teacher can upload lesson slides and homework; student can access them from the relevant lesson; large PDFs are safely bounded or rejected; files remain private; admin can clean storage without touching the command line. Automatic compression and retention deletion are future-phase capabilities.

---

## Phase 4 — Notifications, mail API integration, reminders, and lesson reporting

### Objective

Remove routine communication work from the tutor by making the platform event-driven around the existing `mail.foxtutor.org` API.

### Phase 4.1 current state — 2026-09-13

The local implementation adds forward-only `0006_lesson_reports.sql` and
`0007_notifications.sql`, a typed notification contract, durable D1 outbox
delivery state, typed text/HTML templates, server-side event wiring for
student invitation, lesson creation/change, available resources and existing
cancellation transitions, a five-minute scheduled Worker reminder using one
24-hour policy, an admin delivery view, and an admin-only completed-lesson
report workflow. Fox Mail remains the only provider boundary and retries
retain the same provider idempotency key.

The local suite and clean local D1 migration pass. Production deployment,
authenticated browser acceptance, live scheduler/report fixtures and real
Fox Mail success/idempotency acceptance remain pending. The existing Fox Mail
documentation records that its production internal token and non-interactive
Access Service Auth path must be restored before a real send can be claimed.
`CANCELLATION_REQUESTED` is contract-ready but dormant; cancellation rules and
rescheduling remain Phase 5.

### Phase 4.2 current state — closed baseline

Structured reports now follow the supplied template rather than the generic
4.1 summary/homework model. Migrations `0008_structured_lesson_reports.sql`
and `0009_international_students.sql`
add nullable `students.level`, report-time header snapshots and the structured
Tutorial Feedback fields. Existing 4.1 content is reconciled as
`summary -> This Lesson's Focus`, `homework -> Home Learning Task` and
`additional_notes -> Notes`.

Admins can save/send one report per lesson once its UK start time has passed.
Scheduled lessons are automatically caught up to `completed` after their end
time; student visibility still requires both a completed lesson and a sent
report. Sent reports are immutable in the normal workflow, visible to the
owning student from Previous Lessons, and available through the same
authorized HTML/PDF route for admins.

The report editor uses compact auto-growing fields, default bullet mode,
numbered-list toggling, bold/highlight markers, custom level suggestions and
an existing resource-pipeline attachment dropzone. Lesson attachments are
stored by the existing D1/R2 resource flow and appear in the relevant lesson
for the student. The PDF is generated on demand in the Worker from the
persisted D1 projection; no PDF is written to R2 or D1. Student level is
canonical on `students.level` and duplicated only as a report snapshot.

Migrations through `0009_international_students.sql` are applied to
production. The current deployed runtime commit is `92d5e50`, deployed as
Worker `d69ed1e5-5fd0-4dab-89e8-1a8c462b4b5f`; no remote migrations are
pending.
Generated lesson/report links use compact base64url route keys while existing
UUID links remain compatible. Report HTML titles use
`YY/MM/DD - FoxTutor Lesson Report`, and downloaded PDFs use
`YY-MM-DD FoxTutor Lesson Report.pdf`. The exact baseline commit is preserved
by the `phase-4-complete` tag. Phase 5 consumes the completed notification
outbox and Fox Mail boundary without reopening Phase 4 scope.

### Must achieve

- Define one small, stable internal notification contract.
- Integrate with `mail.foxtutor.org` rather than Gmail/Brevo directly.
- Notification events for:
  - student invited
  - lesson created
  - lesson changed
  - upcoming lesson reminder
  - homework/resource added
  - cancellation processed
  - cancellation request received, if used
  - lesson report sent
- Include lesson link where appropriate.
- Ensure duplicate events do not produce duplicate emails.
- Store notification delivery status and provider reference where useful.
- Provide admin visibility for failed notification delivery.
- Do not create a second mail database.

### Tests

- Mock mail API integration tests.
- Successful send recorded once.
- Timeout/unknown delivery is visible and not silently duplicated.
- Repeating the same event is idempotent.
- Reminder scheduled at correct time.
- Student receives only their own lesson email.
- Teacher report contains correct lesson details/resources/links.
- Links in email require authentication where appropriate.

### Exit criteria

Routine lesson communication no longer requires manual email composition for normal events.

---

## Phase 5 — Cancellation and rescheduling automation

### Objective

Encode the actual practice rule so normal cancellations require no intervention while exceptions remain visible to the tutor.

### Core rule

Default policy:

- More than 24 hours before the lesson: student may cancel directly.
- Less than or equal to 24 hours: student cannot self-cancel without an exception path.

### Phase 5.1 policy decisions

- Exactly 24 hours is treated as late and requires the exception path.
- Started, completed and already-cancelled lessons cannot be student-cancelled.
- Student rescheduling uses the same strict `>24h` window; admin
  rescheduling is available for future scheduled lessons.
- Normal student cancellation is classified `NO_CHARGE`.
- A pending exception is `CANCELLATION_PENDING_DECISION`; an approved
  exception is `EXCEPTION_WAIVED`; an administrative cancellation is
  `ADMIN_CANCELLED`; a reschedule is `RESCHEDULED`.
- These classifications stop at the Phase 6 boundary and are not sent to
  FreeAgent in Phase 5.

### Must achieve

- Server-side cancellation eligibility calculation.
- No reliance on client-side clocks alone.
- Student-facing cancellation button only when eligible.
- Confirmation step.
- Immediate lesson state update.
- Student notification.
- Teacher notification if useful.
- Exceptional cancellation request flow inside the 24-hour window if retained.
- Reschedule flow if required.
- Full audit history of cancellation decision.
- Billing consequence classification.
- No direct billing API call in the synchronous cancellation request.

### Tests

- 48-hour cancellation succeeds.
- Exactly 24-hour boundary behaves according to the documented policy.
- 23h59m cancellation is blocked/exceptional.
- Client clock cannot bypass the rule.
- Cancelled lesson cannot be joined.
- Cancellation notification is sent once.
- Repeated cancellation submission is idempotent.
- Rescheduling preserves historical lesson record if that is the chosen policy.
- Admin can see who initiated and approved a cancellation.
- Calendar feeds reflect cancellation and the current rescheduled occurrence.
- Existing lesson, resource, report and join-link relationships remain coherent.

### Exit criteria

The 24-hour rule is enforced automatically and consistently without manual
intervention for normal cases, and exception decisions are visible and
auditable to the tutor.

---

## Phase 6 — FreeAgent integration boundary and accounting workflow

### Objective

Connect Foxtutor's operational lesson/cancellation state to external accounting without turning Foxtutor into a billing system.

### Must achieve

- Define the exact cancellation → billing consequence contract.
- Maintain an integration/outbox table.
- Idempotency key per business event.
- Retry and visible failure state.
- FreeAgent API adapter.
- External reference storage.
- Manual retry from admin interface.
- Clear separation between operational deletion and accounting retention.

### Tests

- Business event creates one outbox record.
- Same event cannot create duplicate financial action.
- FreeAgent success records external ID.
- FreeAgent timeout remains retryable.
- Permanent failure is visible.
- Admin retry is safe.
- Deleting student operational data does not delete accounting records.

### Exit criteria

Accounting consequences can be passed to FreeAgent reliably without making the tutoring application responsible for direct debit or payment processing.

### Phase 6 current state

The application-side Phase 6 implementation is complete and hardened. The
initial normal lesson accounting setting is 55.00 GBP with no VAT charged.
Admins can change the amount, item type, category, payment terms and explicit
sales-tax rate in `/learn/admin/accounting/settings`; GBP remains enforced and
saved settings are used for future invoices. The current non-VAT setting is
represented in FreeAgent invoice items by an explicit `sales_tax_rate` of `0`.
The
`ADMIN_CANCELLED` accounting consequence remains explicitly unresolved and
must not be inferred from the normal lesson value. The current evidence
matrix, architecture, security controls, test boundary, deployment
distinction, human checklist and acceptance runbook are maintained in
[`docs/phase-6.md`](docs/phase-6.md).

The live Sandbox connection is currently `CONNECTED` for Fox Learning Ltd
(`foxlearningltdgmailcom`), and contact `257175` is persisted as one verified
mapping with no conflict. The live outbox and retry-audit tables are empty;
this is expected because no approved invoice-producing event has been created.
The latest acceptance handoff did not provide executable approvals: all three
submitted values were literal placeholders. Phase 6 therefore remains
operationally open because the `ADMIN_CANCELLED` consequence, effective-date
policy, approved invoice/category mapping, Sandbox provider acceptance and one
controlled production accounting event are outstanding. No technical TODO is
represented as a human blocker, no financial mutation has been fabricated, and
`phase-6-complete` must not be created until the external closure evidence is
recorded.

The deployed Phase 6 UI includes admin billing management with connection
identity and reauthentication, matching settings/back navigation icons, and
compact save/remove controls for explicit FreeAgent contact mappings. The
contact verification path has regression coverage for successful D1
persistence with a `VERIFIED` link, and the malformed 15-column insert that
blocked the deployed mapping path has been corrected.

---

## Phase 7 — Billing engine and long-term operations hardening

Phase 7 is intentionally split into implementation increments. It is not
complete until the relevant increment's implementation, provider boundary and
acceptance evidence have all been recorded.

The repository README presents Phase 7 as one programme, consistent with the
earlier phase summaries. The consolidated current status is maintained in
[`docs/phase-7.md`](phase-7.md); the detailed 7.1 and 7.2 records below are
retained as implementation history and evidence.

### Phase 7.1 — RECURRENT LESSONS + BILLING ORCHESTRATION + PAYMENT READINESS

#### Scope

- Keep recurring lesson series authoritative in FoxTutor.
- Materialise a bounded rolling lesson horizon of six weeks.
- Support instance cancellation, series cancellation, rescheduling, pauses and
  explicit series end dates without rewriting historical records.
- Create one deterministic lesson billing event per billable lesson.
- Carry future-cancellation credit in an immutable FoxTutor ledger and apply
  it oldest-first to later billing events.
- Orchestrate individual FreeAgent invoices and credit notes through durable,
  idempotent provider operations.
- Calculate payment readiness separately from invoice, collection and
  settlement dates.
- Use the existing FreeAgent GoCardless path; do not create a second direct
  GoCardless mandate unless the provider boundary is later proven safe.
- Surface actionable billing alerts and recoverable reconciliation work.

#### Architecture

```text
FoxTutor recurring series
  -> six-week materialised lesson instances
  -> lesson billing event
  -> FoxTutor customer-credit ledger
  -> invoice/credit-note provider operation
  -> individual FreeAgent document
  -> FreeAgent payment and mandate state
  -> payment-readiness calculation and alerts
```

FoxTutor owns lesson entitlement, payer relationships, recurrence, exceptions,
credits, billing readiness and audit history. FreeAgent owns accounting
documents, provider references and payment state exposed by its API. GoCardless
is not a second FoxTutor credit ledger or a parallel mandate authority.

#### Dependencies

- Phase 2 lesson and student records.
- Phase 5 immutable cancellation and reschedule history.
- Phase 6 FreeAgent OAuth, contact mapping, outbox and provider safety.
- Explicit commercial invoice configuration and provider Sandbox access before
  any financial mutation.
- Provider-side confirmation of any credit-note matching operation; the public
  API currently documents no matching endpoint.

#### Acceptance criteria

- Every active series is materialised only through today plus six weeks,
  respecting timezone, DST, pauses and end dates.
- Repeated or concurrent horizon runs do not duplicate or rewrite history.
- Instance-only and future-series cancellation are idempotent and auditable.
- A rescheduled instance keeps one billing identity and follows its actual
  lesson date.
- Future cancellation creates no premature provider credit note and produces
  one local credit grant.
- Credit allocation is deterministic, atomic, oldest-first and replay-safe.
- A zero-net lesson never schedules a Direct Debit collection.
- Collection cannot occur before lesson date minus seven calendar days, for a
  cancelled lesson, without an active mandate, or more than once.
- Provider timeouts and unknown results become reconciliation work rather than
  duplicate creation attempts.
- Payment readiness distinguishes mandate, invoice, collection, settlement,
  failure and unknown states.
- Billing alerts are actionable, deduplicated and linked to the affected
  payer, lesson, event and provider reference.
- Local migrations, unit tests, integration tests, build and schema checks
  pass before any remote deployment is considered.

#### Phase 7.1 current state

The foundational implementation and controlled evidence are complete. This
was the original local-only boundary; Phase 7.2 absorbed its unfinished
technical work, applied migrations through `0024`, and deployed the runtime.
Real provider financial acceptance remains a separate human approval gate and
is recorded in the Phase 7.2 acceptance report.

### Phase 7.2 — Completion and operationalisation

Phase 7.2 absorbs every unfinished Phase 7.1 technical item. It is the
production-hardening increment, not a holding area for deferred engineering.

- Enforce the global `Europe/London` business-time invariant for recurrence,
  materialisation, cancellation, pause/resume, billing dates, collection dates,
  alerts and displays; no per-series timezone is user-selectable.
- Complete recurring-series administration, six-week recovery, idempotency,
  instance cancellation, future cancellation, pause/resume, end dates and
  rescheduling interactions.
- Operate deterministic lesson-level invoice creation, credit allocation,
  collection scheduling, unknown-result recovery and concurrent claims.
- Reconcile FreeAgent invoice status and FreeAgent-GoCardless payment state;
  retain explicit mandate, collection, payment and settlement concepts.
- Complete credit-note creation/status tracking, cancellation-after-invoice
  reconciliation and safe local refund records without fake provider
  settlement. The undocumented FreeAgent credit-note matching limitation
  remains an explicit manual/provider reconciliation path.
- Provide deterministic payment readiness using `CREDIT_COVERED`,
  `NOT_YET_DUE`, `INVOICE_OPEN`, `MANDATE_PENDING`, `COLLECTION_SCHEDULED`,
  `COLLECTION_PENDING`, `PAYMENT_SECURED`, `PAYMENT_FAILED`,
  `PAYMENT_UNKNOWN` and `RECONCILIATION_REQUIRED`.
- Provide billing history, invoice detail, credit detail, customer billing
  visibility and an administrator dashboard for today, the next seven days,
  alerts and reconciliation work.
- Provide deduplicated actionable alerts with acknowledgement/resolution
  audit, provider mismatch visibility and operational runbook guidance.
- Assess contact synchronisation fail-closed; explicit verified mapping remains
  the safe default where FreeAgent identity is ambiguous.
- Complete local migration checks, browser/build/security regression checks,
  deployment smoke checks, remote schema verification and the separated
  real-provider versus controlled-seam acceptance report.

Phase 7.2 is complete only when implementation, tests, documentation,
deployment evidence and handover all agree. Provider financial mutations remain
blocked unless approved Sandbox configuration and explicit human acceptance
evidence exist.

### Phase 7.3 — Numbering note

There is no separate Phase 7.3 repository record. The intervening technical
work was absorbed into the Phase 7.2 operationalisation and subsequent 7.4
remediation records. This is a historical numbering decision, not a claim
that an unrecorded provider or financial acceptance occurred.

### Phase 7.4 through Phase 7.10 — Recorded increments

The later Phase 7 increments are recorded in their dedicated evidence files:

- **7.4:** Student billing Worker 1101 forensic diagnosis and repair.
- **7.5:** Financial safety state model and acceptance gate.
- **7.6:** Direct Debit-first provisioning, emergency policy and sentinel.
- **7.7:** Mandate/payment chain validation and reconciliation.
- **7.8:** FreeAgent billing acceptance finalisation.
- **7.9:** Sandbox/Production environment isolation.
- **7.10:** Broad environment isolation, accounting mapping and category
  selector preparation.

Each increment remains historical evidence; the consolidated current status is
maintained in `docs/phase-7.md`.

### Phase 7.11 — Provider contract and initial environment-aware OAuth routing

#### Objective

Repair the deployed FreeAgent category parser and ensure the admin OAuth
action follows the single server-configured `FREEAGENT_ENVIRONMENT` without
crossing Sandbox and Production credentials, tokens, mappings or company
identity.

#### Delivered

- Normalize the documented four-collection `/v2/categories` response using
  `description`, `nominal_code`, provider URL, group and optional tax rate.
- Deduplicate and deterministically sort category options.
- Reject malformed items, null collections, unsafe URLs and wrong-environment
  category URLs.
- Display readable category descriptions and nominal codes with simple search.
- Generate `/v2/approve_app` on the environment-specific FreeAgent API host.
- Bind OAuth state to provider, environment, administrator, expiry and
  one-time consumption.
- Select Production credentials only from Production configuration; legacy
  generic credentials remain Sandbox-only.
- Verify company subdomain and currency before persisting a connected
  environment.

#### Acceptance

The implementation and deployment gates passed with 38 test files and 229
tests. This increment is historical and was superseded by Phase 7.12's
independent connection model. No financial mutation was performed.

### Phase 7.12 — Independent FreeAgent Sandbox and Production connections

#### Objective

Support simultaneous, independently operated FreeAgent Sandbox and Production
connections without using one global environment selector as the connection
identity.

#### Delivered

- Add explicit `Connect/Reauthenticate Sandbox` and
  `Connect/Reauthenticate Production` admin actions.
- Persist independent connection records, encrypted tokens, OAuth state,
  verified companies and category mappings per environment.
- Route authorization, token exchange, refresh, company reads and category
  reads to the selected environment's official FreeAgent API host.
- Preserve Sandbox-only legacy credential fallback and fail clearly when
  Production credentials are absent.
- Add migration `0030_freeagent_dual_connections.sql` and regression coverage
  for token coexistence and environment-specific OAuth hosts.

#### Acceptance boundary

The Worker is deployed and the migration is applied. Automated validation is
green with 38 test files and 232 tests. Authenticated browser redirect
evidence, live Sandbox provider evidence and Production OAuth/company/contact/
category evidence remain human-gated. No Production financial mutation is
allowed in this phase.

---

## Universal definition of done for every phase

A phase is not complete merely because code works locally.

The phase is complete only when:

- implementation is complete;
- tests pass;
- security checks pass;
- documentation is updated;
- README project map/status is updated;
- changelog contains a blow-by-blow record of the pass;
- architectural decisions are recorded where applicable;
- human-handover notes exist if a human action remains;
- git label/tag is created;
- changes are committed;
- changes are pushed;
- deployment/preview verification is completed at the appropriate environment;
- the repository is clean;
- the next agent can start from the README alone.

## Agent sequencing rule

Coding agents must work from discrete task prompts. Agents must not assume conversational context. Every task begins by reading:

1. `README.md`
2. `docs/AGENT_INSTRUCTION.md`
3. the current phase document
4. relevant architecture/decision documents
5. current `docs/CHANGELOG.md`

Agents must inspect the current repository state before changing files.

If human intervention is required, the agent must first complete everything possible, update documentation, commit and push its completed work, and then stop with explicit human handover instructions.
