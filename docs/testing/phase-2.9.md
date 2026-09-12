# Phase 2.9 testing and acceptance record

Date: 2026-09-12  
Status: local implementation in progress; authenticated browser acceptance pending

## Scope

Phase 2.9 corrects interface composition after Phase 2.8's functional pass still left the calendar toolbar, subscription utility and lesson form visually compressed. It also removes the rejected 96-option start-time selector in favor of a native 24-hour quarter-hour input with an immediate 55-minute End preview.

## Automated UI contracts

| Area | Result | Evidence |
| --- | --- | --- |
| Month default and Week secondary | PASS locally | Existing FullCalendar contract remains in `tests/unit/calendar-ui.test.ts` |
| Previous/Next accessible labels | PASS locally | `datesSet` continues to set period-specific labels |
| Previous/Next visible icons | PASS in source contract | Client creates inline SVG chevrons and applies `calendar-nav-icon` |
| Native time input | PASS in source contract | Create markup uses `input type="time"` with `step="900"` |
| No 96-option selector | PASS in source contract | `timeOptions` and start-time option generation are removed |
| Immediate date-independent preview | PASS in source contract | Client listens to Start `input` and adds duration without Date |
| Internal confirmation | PASS in source contract | Subscription markup uses `role="alertdialog"` and `aria-modal` |
| No browser-native dialogs | PASS in source contract | No `alert(`, `confirm(` or `prompt(` in `src` |

## Required browser acceptance

Not yet run. A Chromium runtime is not available in this session, so no visual PASS is claimed. Fresh authenticated admin and student sessions must inspect:

- 1440px normal zoom;
- 1440px at approximately 75% zoom;
- 820px tablet;
- 390px mobile.

The browser pass must verify calendar composition, plainly visible arrows, Month/Week grouping, readable events, subscription open/closed states, internal regeneration confirmation, create-form columns, native time entry, immediate preview for `16:00`, `16:15`, `16:30`, `16:45`, `09:00`, `12:45` and `23:15`, mobile stacking, focus, ownership/privacy and student absence of admin controls.

## Regression matrix

| Area | Result |
| --- | --- |
| Calendar composition and density | PENDING browser |
| Previous icon visible | PENDING browser |
| Next icon visible | PENDING browser |
| Today control | PENDING browser |
| Month/Week control | PENDING browser |
| Month default / Week view | PENDING browser |
| Subscription closed/open layout | PENDING browser |
| Subscription link field / Copy | PENDING browser |
| Regeneration / internal confirmation / success | PENDING browser |
| Create Lesson desktop grid | PENDING browser |
| Create Lesson mobile layout | PENDING browser |
| 24-hour time input / no 96 options | PASS locally / browser pending |
| Quarter-hour validation | PASS by existing domain/server tests |
| Immediate End preview / midnight crossover | PASS in implementation contract / browser pending |
| Europe/London and DST persistence | PASS by existing domain tests / production pending |
| Lesson URL and Notes | PASS by unchanged domain flow / production pending |
| Ownership and private notes | PASS by unchanged authorization/query tests / production pending |
| Feed/token regression | PENDING production |
| Access boundary | PASS for public `/learn` redirect; authenticated scope pending |
| Public-site regression | PASS post-deployment smoke |
| Accessibility | PENDING browser |
| Automated tests/build/checks | PASS locally — `npm test` (13 files, 38 tests), `npm run build`, `npm run check`, `npm run test:browser`, `npm run test:production`, `git diff --check` |
| Cleanup and Git state | PENDING final pass |
| Phase 2.9 completion | FAIL/PENDING until browser evidence exists |
| Phase 2 final sign-off | FAIL/PENDING |

## Local command evidence

The final local run completed on 2026-09-12:

```text
npm test                 PASS — 13 files, 38 tests
npm run build            PASS — type-check and client bundle
npm run check            PASS — build and Wrangler dry-run
npm run test:browser     PASS — static focus/reduced-motion/noindex contract
npm run test:production  PASS — public endpoints and /learn Access redirect
git diff --check         PASS
```

The production smoke was run against `https://foxtutor.org` before and after deployment; `/` returned 200, `/robots.txt` and `/sitemap.xml` returned 200 without Learn in the sitemap, and `/learn` returned the expected 302 Access redirect. No authenticated browser, feed regression, production cleanup or final acceptance claim is recorded.
