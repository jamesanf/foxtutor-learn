# Phase 2.8 testing and acceptance record

Date: 2026-09-12  
Status: local UX implementation complete; authenticated production acceptance pending

## Scope

Phase 2.8 is a focused refinement pass after real browser review of the Phase 2.7 Month-first calendar. It reduces calendar density, improves navigation affordances, simplifies the private subscription utility and redesigns standard lesson creation around a 55-minute UK tutoring workflow. The lessons table, student ownership, lifecycle, UTC/IANA model, feed/token system, Access boundary and public-site isolation remain authoritative.

## Local implementation checks

| Area | Result | Evidence |
| --- | --- | --- |
| Month default | PASS locally | FullCalendar `initialView: "dayGridMonth"` remains unchanged |
| Week secondary view | PASS locally | FullCalendar toolbar retains `dayGridWeek` |
| Compact toolbar and grid styling | PASS in source/build | Reduced page/calendar spacing, button sizing, cell/event padding and responsive toolbar rules |
| Previous/Next affordances | PASS in source/build | FullCalendar standard chevrons retained; dates-set callback adds period-aware accessible labels |
| Today and Month/Week controls | PASS in source/build | Single library-owned toolbar and accessible labels |
| Calendar copy | PASS in source | Calendar tagline and timezone implementation note removed |
| Add Lesson | PASS in source | One admin heading-level action; no per-day controls |
| Subscription collapsed | PASS in source | Native disclosure remains closed unless a link is generated in the response |
| Subscription compactness | PASS in source | Link, Copy, Generate/Generate new link, concise warning and status only |
| Internal regeneration confirmation | PASS in source/build | Application-native confirmation panel; no browser dialog |
| Internal success feedback | PASS in source | Concise status message after generation/regeneration |
| Standard lesson duration | PASS in unit tests | `deriveLessonEnd` uses 55 elapsed minutes from the UTC instant |
| Start-time choices | PASS in unit tests/source | Select offers `:00`, `:15`, `:30`, `:45`; server rejects non-quarter-hour values |
| Derived end display | PASS in source | Server preview and client `output` update use Europe/London context |
| DST handling | PASS in unit tests | Europe/London spring transition and nonexistent local time covered |
| Notes treatment | PASS in source | Notes moved into collapsed Additional details on create; edit/detail support remains |
| External lesson URL | PASS by unchanged validation | HTTPS-only validation and storage remain in the existing domain flow |
| Inline validation | PASS by unchanged server flow | Form errors remain in `role="alert"` surfaces; overlap remains server-side |
| Native dialogs | PASS in source | No `alert(`, `confirm(` or `prompt(` in `src` |
| Student privacy | PASS by unchanged queries | Student calendar/event projection remains role-scoped and notes-free |
| Feed regression | PENDING production | Feed serializer/token/ownership code unchanged; production regression still required |
| Access boundary | PENDING production | No route or Access configuration change; live verification still required |
| Public-site regression | PENDING current pass | Existing production smoke must be rerun after deployment |

## Automated local gates

| Command | Result |
| --- | --- |
| `npm test` | PASS — 12 files, 35 tests |
| `npm run build` | PASS — type-check and client bundle |
| `npm run check` | PASS — type-check, bundle and Wrangler dry-run; 67.46 KiB upload / 15.33 KiB gzip |
| `npm run test:browser` | PASS — static focus, reduced-motion and noindex contract |
| `npm run test:production` | PASS — public endpoints unaffected and `/learn` remains Access-protected |
| `git diff --check` | PASS |

## Required browser acceptance

Use fresh authenticated admin and student sessions against the real application at:

- desktop 1440px normal zoom;
- desktop 1440px at approximately 75% zoom;
- tablet 820px;
- mobile 390px.

Inspect Month default, Week switch, Previous, Today, Next, current title, concise events, canonical lesson links, admin Add lesson, compact create form, derived end preview, overlap errors, subscription disclosure, Copy, internal regeneration confirmation, success status, keyboard focus and touch targets. Confirm students cannot see Add lesson, other students or private notes.

## Required timezone and data checks

Verify Europe/London creation, UTC persistence, 55-minute derived end, the Europe/London spring DST boundary, calendar Month/Week placement, lesson detail rendering, HTTPS lesson URL persistence and unchanged lifecycle/overlap behavior. Preserve broader existing timezone regression coverage.

## Required feed, security and cleanup checks

Repeat valid/invalid `.ics` requests, stable UID, status mapping, private notes exclusion, student ownership, token rotation/revocation, private headers, Access path scope and public-site smoke checks. Any temporary production fixtures must be removed by exact ID and no legitimate user/feed may be changed.

## Acceptance matrix

| Area | Result |
| --- | --- |
| Calendar Month view | PASS locally / production pending |
| Month default | PASS locally / production pending |
| Week view and switch | PASS locally / production pending |
| Previous / Next / Today | PASS locally / production pending |
| Navigation iconography and labels | PASS locally / production pending |
| Calendar density and 75% zoom | PENDING authenticated browser |
| Desktop / tablet / mobile UX | PENDING authenticated browser |
| Explanatory-copy removal | PASS locally |
| Add Lesson workflow | PASS in source / production pending |
| Compact lesson form | PASS in source / production pending |
| 55-minute duration and derived end | PASS in unit tests / production pending |
| 15-minute start increments | PASS in unit tests / production pending |
| UK timezone and DST correctness | PASS in unit tests / production pending |
| Notes de-emphasis | PASS locally |
| External lesson URL | PASS by unchanged domain flow |
| Inline validation and overlap protection | PASS by unchanged server flow / production pending |
| No browser-native dialogs | PASS in source |
| Subscription collapsed and concise | PASS in source / production pending |
| Internal confirmation and success feedback | PASS in source / production pending |
| Student privacy and admin controls | PASS by unchanged authorization / production pending |
| Feed/token regression | PENDING production |
| Access/public-site regression | PENDING production |
| Accessibility | PENDING authenticated browser |
| Automated tests/build/checks | Partial: test/build PASS, full gates pending |
| Production deployment | PASS — Worker `999b4239-49f2-4bc3-9dfd-a2bb29d46637` |
| Authenticated production acceptance | PENDING |
| Cleanup and documentation reconciliation | PENDING final pass |
| Git clean and Phase 2.8 completion | PENDING |
