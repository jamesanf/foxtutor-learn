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
├── AGENT_INSTRUCTION.md
├── CHANGELOG.md
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

Phase 1.6 has completed the safe reconciliation work available to the runtime without rebuilding Phase 1.5: the live Worker, D1, exact routes and Learn Access application were inspected; the production D1 student was changed from `student.test@foxtutor.org` to `jamesanf@gmail.com`; the final D1 role set is the unchanged admin plus the active James student; Fox Mail’s authoritative internal API and idempotency contract were inspected; and the complete local, build, Wrangler, browser-contract and production-smoke commands passed.

The phase remains **blocked, not complete**. The exposed Cloudflare environment token cannot read or write the Learn Access application policy, so the policy still contains the temporary student identity and must be reconciled before browser acceptance. Fox Mail’s `INTERNAL_API_TOKEN` is not present in its production Worker secret inventory, and its internal endpoint still requires a non-interactive Access Service Auth path. Human-assisted Google sign-in and the controlled Fox Mail send/replay remain unperformed. No completion tag may be created.

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

## Phase 3 — Lesson resources, R2, PDF/document processing, retention, and admin file manager

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
- Upload state machine: pending, processing, ready, failed, deleted.
- PDF inspection.
- Automatic PDF compression for oversized PDFs.
- Original oversized object removed after successful processing unless explicit admin retention is required.
- Clear user-facing compression/upload progress.
- Reject unsupported formats safely.
- Retention metadata, default at least 12 months for lesson resources.
- Automated retention housekeeping.
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

Teacher can upload lesson slides and homework; student can access them from the relevant lesson; large PDFs are automatically handled; files remain private; admin can clean storage without touching the command line.

---

## Phase 4 — Notifications, mail API integration, reminders, and lesson reporting

### Objective

Remove routine communication work from the tutor by making the platform event-driven around the existing `mail.foxtutor.org` API.

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

### Exit criteria

The 24-hour rule is enforced automatically and consistently without manual intervention for normal cases.

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

---

## Phase 7 — Optional billing visibility and long-term operations hardening

### Objective

Add useful read-only billing history only when the core portal is stable.

### Possible capabilities

- Payment history.
- Invoice list.
- Invoice detail links.
- Account balance/status.
- Provider-hosted direct debit setup link only if genuinely required.

### Explicit non-goal

Do not build bank-detail editing or direct-debit administration into the Foxtutor database unless a clear operational requirement emerges.

### Operations hardening

- Scheduled retention jobs.
- Storage reports.
- Largest-file report.
- Failed integrations dashboard.
- Failed notification dashboard.
- Backup/export procedures.
- Dependency update policy.
- Security review.
- Accessibility review.
- Browser compatibility checks.
- Production smoke tests.
- Incident/runbook documentation.

### Exit criteria

The platform can be left running with routine monitoring limited to meaningful failures and occasional maintenance rather than day-to-day administration.

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
2. `AGENT_INSTRUCTION.md`
3. the current phase document
4. relevant architecture/decision documents
5. current `CHANGELOG.md`

Agents must inspect the current repository state before changing files.

If human intervention is required, the agent must first complete everything possible, update documentation, commit and push its completed work, and then stop with explicit human handover instructions.
