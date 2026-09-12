# Phase 2.10 testing and acceptance record

Date: 2026-09-12  
Status: local implementation and rendered browser review complete; production acceptance pending

## Automated contracts

| Area | Result | Evidence |
| --- | --- | --- |
| FullCalendar Standard TimeGrid dependency | PASS locally | `@fullcalendar/timegrid@6.1.21` is pinned beside core/daygrid |
| Week default | PASS locally | Client contract requires `initialView: "timeGridWeek"` |
| Month secondary | PASS locally | Client toolbar contract requires `timeGridWeek,dayGridMonth` |
| 09:00 visible start | PASS locally | `slotMinTime` and `scrollTime` are `09:00:00` |
| 21:00 visible boundary | PASS locally | `slotMaxTime` is `21:00:00` |
| Visible navigation icons | PASS source contract | Existing inline SVG chevrons remain required |
| Concise events | PASS locally | Worker sends title/displayTime separately; client renders bounded spans |
| Bookings route | PASS locally | Authorization route and Worker handler exist at `/learn/admin/bookings` |
| Bookings server pagination | PASS locally | D1 query uses bound `LIMIT`/`OFFSET` and count query |
| Bookings page sizes | PASS locally | Worker accepts only 12, 24 or 48 and falls back to 12 |
| Bookings filtering/sorting | PASS locally | Query restricts to future scheduled rows and orders start/id ascending |
| Dashboard duplication removal | PASS source contract | Admin dashboard renders summaries and upcoming preview, not quick-link cards |
| Student single-email model | PASS source contract | Student form contains one login email and explicit server lookup |
| Native Start input | PASS locally | `input[type="time"]` with `step="900"` remains in create form |
| Immediate End preview | PASS locally | Client contract covers date-independent Start + 55 minutes |
| Browser dialogs | PASS source audit | No Learn `alert(`, `confirm(` or `prompt(` usage |
| Responsive calendar structure | PASS locally | Rendered TimeGrid was inspected at 1440px, approximately 75% desktop zoom, 820px and 390px; mobile table rules are scoped away from FullCalendar |

## Required browser acceptance

Local authenticated browser inspection is complete through the test identity proxy. Fresh production admin and student sessions remain required before deployment. Local renders were inspected at:

- 1440px desktop;
- 1440px at approximately 75% zoom;
- 820px tablet;
- 390px mobile.

The browser pass must verify:

- Week is the first rendered view and Month is secondary;
- the toolbar shows visible left/right icons, Today, a readable date title and Week/Month grouping;
- the timetable focuses on 09:00–21:00 and places 09:00, 10:15, 13:00, 17:00, 18:15 and 20:00 lessons correctly;
- 17:00–17:55, 20:15–21:10, 09:00–09:55 and off-range lessons remain readable and reachable;
- event text stays inside event bounds and student privacy is preserved;
- Add lesson, Create Lesson time preview, subscription disclosure and internal confirmation work with keyboard focus;
- Bookings supports 0/1/12/13/24/25/48/49 rows, 12/24/48 sizes, final-page behavior and mobile stacked rows;
- Dashboard is useful without duplicating the sidebar;
- Students uses one email field and retains safe account linking;
- admin/student ownership, Access, feed and no-private-data boundaries remain intact.

### Local rendered evidence

- Desktop calendar: Week is the default, Month is the only secondary view, the toolbar shows inline SVG chevrons, Today, a readable period title and the Week/Month switch, and the bounded timetable uses a 09:00–21:00 focus.
- Calendar navigation: the local event was advanced into the visible week; the rendered event remained within its time cell and displayed concise student/time content. Month and Week switches returned the expected titles.
- Mobile calendar: the toolbar becomes a readable stacked control group, both view buttons and directional icons remain discoverable, the TimeGrid remains horizontally scrollable within its own surface, and document-level horizontal overflow is absent.
- Dashboard, Bookings and Create Lesson were inspected at desktop/mobile widths. Dashboard shows summaries and an upcoming preview rather than duplicate navigation cards; Bookings uses the responsive stacked row treatment; Create Lesson retains the comfortable native time input and derived End preview.
- Student creation was inspected in the local authenticated session and exposes one email input labelled `Login email`; no duplicate Learn account email field is rendered.

## Bookings acceptance matrix

| Upcoming lessons | Page size | Expected |
| ---: | ---: | --- |
| 0 | 12 | Empty state with Add lesson |
| 1 | 12 | One row, no pagination |
| 12 | 12 | One page |
| 13 | 12 | Two pages |
| 24 | 24 | One page |
| 25 | 24 | Two pages |
| 48 | 48 | One page |
| 49 | 48 | Two pages |

Invalid `size=0`, `size=13`, `size=1000`, negative/non-numeric pages and out-of-range pages must fail safely without arbitrary limits or query errors. Completed and cancelled lessons must not appear.

## Local command evidence

Completed:

```text
npm test                 PASS — 14 files, 41 tests
npm run build            PASS — type-check and client bundle
npm run check            PASS — Wrangler dry-run
npm run test:browser     PASS — static shell contract
npm run test:production  PASS — public-site and /learn boundary smoke
git diff --check         PASS
```

Pending before release:

```text
fresh authenticated production admin/student browser review
production feed, privacy, ownership and Access regression
controlled fixture cleanup and production parity verification
```

Production authenticated acceptance, feed regression, cleanup, deployment parity and the final Phase 2 acceptance matrix remain pending. No Phase 2.10 completion tag or Phase 2 closure claim is recorded.
