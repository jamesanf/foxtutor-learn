# Foxtutor Learn

Foxtutor Learn is a private, invite-only tutoring portal for students and the Foxtutor administrator. It is a small Cloudflare-native application for lessons, resources, notifications and later operational workflows. It is not a public tutoring marketplace, public registration system, password service or replacement for Fox Mail, FreeAgent or GoCardless.

## Current status

**Phase:** Phase 2.1 complete after Phase 2.2 acceptance, visual hardening and operational closure
**Production URL:** `https://foxtutor.org/learn` (private Access perimeter active)
**Public site:** `https://foxtutor.org/` remains a separate read-only deployment
**Latest state:** `foxtutor-learn` Worker, production D1, exact Learn routes, Google-backed Access app/policy, branded shell, role model, session foundation, tests and public regression evidence are deployed. Pass 1 now uses the established FoxTutor deep cyan top bar, a grounded application background, stronger surface/table/form contrast and explicit responsive navigation states. Production D1 now contains `foxlearningltd@gmail.com` as `ADMIN` and `jamesanf@gmail.com` as `STUDENT`.

The final Access policy permits only `foxlearningltd@gmail.com` and `jamesanf@gmail.com`; the production D1 contains only those active admin/student records after controlled fixture cleanup. Phase 1 is closed and tagged `phase-1-complete`. Phase 2.1 adds forward-only student/lesson tables and server-rendered CRUD flows while preserving the existing Access, session, role, noindex, public-site and Fox Mail boundaries. Migration `0002_students_lessons.sql` is applied to production and Worker version `85129275-02b5-40be-8626-db554aa6903f` is deployed. Phase 2.1 acceptance is complete and tagged `phase-2.1-complete`.

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

**Pass 5 — final regression, cleanup and closure (2026-09-12):** COMPLETE. Re-ran the full automated suite, production smoke, public endpoint regression and authenticated post-cleanup admin/student checks. Verified Europe/London and America/New_York display under an overridden browser timezone, overlap rejection and non-overlap acceptance, scheduled/completed/cancelled lifecycle behavior, invalid transition rejection and student lifecycle immutability. Deactivated/cancelled fixtures through the authenticated admin mechanisms, then removed the exact controlled fixture IDs with a guarded production cleanup; no real identity or unrelated record was touched. Final D1 state contains only `foxlearningltd@gmail.com` (`ADMIN`, `ACTIVE`) and `jamesanf@gmail.com` (`STUDENT`, `ACTIVE`), with migrations `0001_foundation.sql` and `0002_students_lessons.sql`.

**Final acceptance gates:** all Phase 2.1/2.2 acceptance gates PASS, including desktop/tablet/mobile responsive inspection, authenticated production regression, public regression, controlled fixture cleanup, README/CHANGELOG, clean Git tree and verified production deployment. No calendar, availability, recurrence, notifications, resources or billing work was started.

## Architecture

`foxtutor.org/learn` and `foxtutor.org/learn/*` are separate, narrowly scoped Worker routes. Cloudflare Access is the identity perimeter; the Worker maps the Access email to an active D1 user, creates an opaque server-side session, enforces `ADMIN`/`STUDENT` authorization and serves private HTML. Student records are explicitly linked to Learn users, and student lesson queries enforce that ownership in SQL. Learn responses use `X-Robots-Tag` and an HTML robots meta tag. Mail remains behind the server-side `mail.foxtutor.org/internal/api/v1/messages/send` adapter boundary.

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

`npm test` runs unit, integration and security tests. `npm run test:browser` runs the static accessibility/noindex contract. `npm run test:production` performs public-site and `/learn` smoke requests and currently verifies the live Access redirect and public boundary. Authenticated Chromium production flows remain a human checkpoint. `npm run deploy` is only for an authorized production deployment after source/configuration changes.

The deployment procedures are in [`docs/deployment/phase-1.md`](docs/deployment/phase-1.md) and [`docs/deployment/phase-2.1.md`](docs/deployment/phase-2.1.md). Never deploy from the public Foxtutor repository and never modify its Worker, Pages project, DNS or routes.

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
| `docs/security/phase-1.md` | Access, authorization and privacy controls |
| `docs/deployment/phase-1.md` | Local, staging and production operations |
| `docs/api/mail-boundary.md` | Fox Mail integration contract |
| `docs/testing/phase-1.md` | Test matrix and evidence |
| `docs/testing/phase-2.1.md` | Phase 2.1 validation and local HTTP matrix |
| `docs/deployment/phase-2.1.md` | Phase 2.1 migration and deployment sequence |
| `docs/evidence/phase-1/` | Public baseline and deployment evidence |
| `docs/handover/phase-1.md` | Exact human actions still required |

## Phase map

| Phase | Goal | State |
|---|---|---|
| 0 | Constitution and repository foundation | Bootstrap inherited |
| 1 | Private `/learn`, Google/Access auth, roles, anti-indexing | Complete and tagged `phase-1-complete` |
| 2.1 | Students, lessons, ownership and lifecycle | Complete and tagged `phase-2.1-complete` |
| 2 | Calendar and later scheduling features | Deferred |
| 3 | R2 resources and document pipeline | Deferred |
| 4 | Mail notifications and reports | Deferred |
| 5 | Cancellation automation | Deferred |
| 6 | FreeAgent boundary | Deferred |
| 7 | Optional billing visibility and hardening | Deferred |

## Security model

There is no public registration and no application password subsystem. Only Access-authenticated identities reach the application boundary in production. Active D1 users are required; unknown or disabled identities receive a generic denial. Sessions are opaque, server-side, `Secure`, `HttpOnly`, `SameSite=Strict` cookies with a separate CSRF token for mutations. Learn content is private, non-cacheable and explicitly noindex.

## Known limitations

- Authenticated Chromium evidence was captured with separate clean profiles; no passwords or browser credentials were requested or recorded. The unknown identity was denied at the final Cloudflare Access perimeter before reaching Learn.
- Fox Mail requires its `INTERNAL_API_TOKEN` plus a non-interactive Access Service Auth path before Learn can claim production delivery/idempotency evidence.
- No real student data was added; the only active D1 users are the controlled admin and student identities.
- Phase 2.1 is intentionally limited to students, lessons, ownership, lifecycle, notes, HTTPS lesson URLs, timezone-safe storage and overlap-aware scheduling.
- Phase 2.1 acceptance is closed; later calendar, availability, recurrence, notifications, resources, billing and reporting phases remain deferred.
