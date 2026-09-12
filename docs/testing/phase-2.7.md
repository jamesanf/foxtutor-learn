# Phase 2.7 testing and acceptance record

Date: 2026-09-12  
Status: implementation and local gates complete; production acceptance pending

## Scope

Phase 2.7 replaces the bespoke week-first calendar presentation with a locally bundled FullCalendar Standard day-grid integration. It does not change the lessons table, lesson CRUD, feed serializer, feed token model, D1 migrations, Access configuration or student ownership queries.

## Dependency assessment

| Check | Result | Evidence |
| --- | --- | --- |
| Mature production component | PASS | FullCalendar Standard day-grid selected over the bespoke renderer |
| Commercial/private use license | PASS | `@fullcalendar/core@6.1.21` and `@fullcalendar/daygrid@6.1.21` are MIT |
| Premium features absent | PASS | No Scheduler/Premium package, plugin or license key |
| Self-contained deployment | PASS | npm packages bundled to `public/learn.js`; no CDN or hosted runtime |
| Package footprint | PASS | 187 KiB uncompressed bundle; Wrangler dry-run 64.11 KiB total asset upload |
| Architecture fit | PASS | Vanilla TypeScript enhancement over server-rendered HTML |

## Automated local gates

| Command | Result |
| --- | --- |
| `npm test` | PASS — 11 files, 30 tests |
| `npm run build` | PASS — type-check and client bundle |
| `npm run check` | PASS — build and Wrangler dry-run |
| `npm run test:browser` | PASS |
| `npm run test:production` | PASS |
| `git diff --check` | PASS |

## UI acceptance matrix

| Area | Result | Required evidence |
| --- | --- | --- |
| Month view | PASS locally | `initialView: "dayGridMonth"` and FullCalendar day-grid integration |
| Month is default | PASS locally | No view query or persisted week state; initial view is Month |
| Week view available | PASS locally | Toolbar includes `dayGridWeek` |
| Month/Week switching | PASS locally | FullCalendar toolbar configuration |
| Previous/Today/Next navigation | PASS locally | Single library-owned toolbar |
| Current period heading | PASS locally | FullCalendar title in the same toolbar |
| Lesson display | PASS locally | Minimal server-projected event data and concise titles |
| Lesson click | PASS locally | Canonical role-specific lesson URLs |
| Admin lesson creation | PASS locally | Single heading-level Add lesson action; existing form/validation retained |
| Student read-only calendar | PASS locally | Student query and renderer expose no creation action |
| Removal of per-day Add lesson UX | PASS | Old day renderer and `.calendar-add` styling removed |
| Subscription collapsed | PASS by inherited implementation | Existing `<details>` remains below calendar |
| Subscription secondary | PASS by inherited implementation | Calendar markup precedes subscription utility |
| Desktop 1440px | PENDING production | Fresh authenticated admin and student Chromium |
| Tablet 820px | PENDING production | Toolbar, title and events remain usable |
| Mobile 390px | PENDING production | Month grid, touch targets and overflow remain understandable |
| Keyboard/focus/accessibility | PASS locally; PENDING production | Toolbar buttons, event links, disclosure and focus inspection |
| Student ownership | PASS by unchanged server query; PENDING production | Cross-student authenticated acceptance |
| Feed regression | PASS by unchanged code; PENDING production | `.ics` headers, UID, status, timezone, rotation and live refresh |
| Access boundary | PASS by unchanged config; PENDING production | Normal Learn routes protected; feed exception remains narrow |
| Public-site regression | PASS | Production smoke script |

## Timezone checks

The event payload preserves UTC instants and includes the stored lesson timezone in the visible title. Acceptance must cover Europe/London, America/New_York, DST boundary examples and any lesson crossing midnight. The browser calendar grid remains in Europe/London, the existing Learn calendar display timezone.

## Production acceptance plan

Fresh authenticated Chromium sessions must verify, separately as admin and student:

- `/learn/admin/calendar` and `/learn/student/calendar` open to the current Month;
- Month/Week controls, Previous, Today and Next work without a page reload;
- lesson positions, labels, statuses and canonical click routes are correct;
- admin Add lesson and existing overlap/timezone validation still work;
- student sees only linked lessons and no admin controls or private notes;
- the subscription remains collapsed and subordinate;
- 1440px, 820px and 390px layouts remain usable with keyboard focus visible.

Feed, token, ownership, Access, public-site, status and timezone regression checks must be repeated against production. Any controlled fixtures must be removed by exact ID, with legitimate users and feeds preserved.

## Final Git state

`phase-2.7-complete` must not be created until deployment, authenticated production acceptance, cleanup, documentation reconciliation, clean-tree verification and push all pass. Historical `phase-2.5-complete` and `phase-2.6-complete` tags remain intact.
