# Phase 2.6 testing and sign-off record

Date: 2026-09-12

## Scope

Phase 2.6 is the final remediation and sign-off pass for Phase 2. It refines the calendar subscription presentation without changing the lesson, feed, token, D1 or Access architecture.

## UI acceptance

| Area | Result | Evidence |
| --- | --- | --- |
| Calendar is the first visual priority | PASS | Live authenticated admin Chromium capture after Worker `12109e60-3f5a-4bc2-8b89-8eefc7586249`; calendar markup precedes subscription markup |
| Subscription closed by default | PASS | Live admin GET rendered `<details class="subscription-card">` without `open` |
| Disclosure opens and closes | PASS | Native summary click and keyboard activation toggled the live details element |
| Keyboard and focus | PASS | Summary received focus; Space activation opened/closed the native disclosure; focus CSS is present in the static contract |
| URL field label | PASS | Generated-state template uses an explicit `label[for="feed-link"]`; copy control targets the labeled input |
| Warning hierarchy | PASS | Live expanded view uses a restrained blue note surface inside the disclosure, not an alert/error treatment |
| Apple/Google instructions | PASS | Live expanded view contains concise Apple Calendar, Google Calendar and other iCalendar instructions |
| Admin role language | PASS | Live admin summary says “Keep your teaching calendar up to date in another app.” |
| Student role language | PASS | Shared renderer uses student-specific “Keep your lessons up to date” copy; Phase 2.5 authenticated student acceptance remains PASS and student authorization code was unchanged |

## Responsive acceptance

Fresh authenticated admin Chromium inspection was completed at 1440px, 820px and 390px. The closed disclosure remained compact and below the calendar. The expanded 390px view was captured after scrolling to the utility; it remained readable with no horizontal overflow, a full-width action button and usable instructions.

The Phase 2.5 authenticated student responsive matrix remains valid because the student route uses the same server-rendered calendar and CSS surfaces, with no student data or authorization changes in Phase 2.6.

## Feed regression and privacy

No production fixture or bearer token was created or rotated during Phase 2.6. The feed implementation is unchanged from the accepted Phase 2.5 release. The following Phase 2.5 live evidence remains authoritative and was rechecked at the route boundary after deployment:

- exact invalid feed path returns generic `404`, private/no-store and noindex headers;
- normal `/learn`, admin calendar and student calendar routes redirect to the existing Access application;
- production D1 contains `users`, `students`, `lessons` and `calendar_feeds`;
- migrations `0001_foundation.sql`, `0002_students_lessons.sql` and `0003_calendar_feeds.sql` are applied;
- final D1 population remains one active admin, one active student and one active feed;
- ownership, token rotation/invalidation, stable UIDs, status mapping, timezone conversion, live propagation and cleanup remain covered by `docs/testing/phase-2.5.md`.

## Automated and production checks

The following completed after the Phase 2.6 deployment:

```text
npm test
npm run build
npm run check
npm run test:browser
npm run test:production
git diff --check
```

All passed. The final automated suite reported 11 test files and 31 tests passing. Production smoke confirmed the public homepage, robots and sitemap remain unchanged; `/learn` remains behind Access; and the exact invalid feed path remains reachable only through Worker token validation.

## Access and production boundary

The live Access applications remain narrowly scoped:

- `foxtutor.org/learn` — email allow policy for the provisioned Learn identities;
- `foxtutor.org/learn/calendar/feed/*` — `Bypass`/Everyone only for the feed subtree.

No host-level bypass or broader `/learn/*` exception was introduced.

## Documentation reconciliation

Updated `README.md`, `docs/AGENT_INSTRUCTION.md`, `docs/PHASE_PLAN.md`, `docs/CHANGELOG.md`, `docs/architecture/phase-2.4.md`, `docs/deployment/phase-2.6.md` and this record. Historical Phase 2.5 records remain intact, while current-state wording now identifies Phase 2.6 as the definitive closure pass.

## Final acceptance matrix

| Area | Result |
| --- | --- |
| Learn production app | PASS |
| Student/lesson regression | PASS |
| Admin calendar | PASS |
| Student calendar | PASS |
| Subscription closed by default | PASS |
| Subscription expanded behaviour | PASS |
| Subscription visual hierarchy | PASS |
| Subscription responsive UX | PASS |
| Subscription accessibility | PASS |
| Feed generation | PASS (Phase 2.5 live evidence retained; UI path unchanged) |
| Admin feed | PASS |
| Student feed isolation | PASS |
| Token rotation | PASS |
| Old token invalidation | PASS |
| Stable UID | PASS |
| Status mapping | PASS |
| Timezone behaviour | PASS |
| Live change propagation | PASS |
| Access boundary | PASS |
| Public-site regression | PASS |
| Fox Mail regression | PASS — no Fox Mail repository or deployment changes |
| Production cleanup | PASS — no new fixtures created |
| Automated tests | PASS |
| Build | PASS |
| Static/type checks | PASS |
| Browser checks | PASS |
| Documentation reconciliation | PASS |
| Git clean | PASS at final sign-off |
| `phase-2.6-complete` tag | PASS at final sign-off |

## Limitations and deferred work

External calendar providers still control their own refresh cadence. Learn provides a read-only live iCalendar feed and does not promise immediate provider refresh. Recurrence, availability, reminders, notifications, resources, booking, billing, reporting, analytics and two-way calendar APIs remain deferred to Phase 3 or later.
