# Phase 2.11 visual contract and acceptance record

Date: 2026-09-12  
Status: local visual acceptance PASS; production-authenticated acceptance NOT RUN

## Root-cause evidence

Before remediation, real Chrome at 1440x900 measured:

- Month calendar host: 670px;
- Month body: 580px;
- five Month rows: approximately 116px each;
- event child text: `rgb(255, 255, 255)` over pastel status backgrounds;
- collapsed subscription: 62px, with an open content stack that mixed controls and confirmation.

## Automated contracts

| Contract | Result | Evidence |
| --- | --- | --- |
| FullCalendar Standard Week default | PASS | `initialView: "timeGridWeek"` |
| Natural Month sizing | PASS | `height: "auto"`, `expandRows: false`, `fixedWeekCount: false` |
| Month row count | PASS | September 2026 renders 5 rows; August 2026 renders 6 rows |
| Month internal vertical scrolling | PASS | `bodyScrollDelta = 0`, visible final row |
| Rendered event contrast | PASS | Chrome computed colours produce 7.13:1–8.31:1 |
| Event visibility | PASS | Non-zero event boxes; text spans stay within event bounds |
| Subscription collapsed state | PASS | 62px desktop, 58px mobile; hidden confirmation contributes no height |
| Confirmation composition | PASS | 520px self-contained panel; Cancel and Regenerate have a 12px gap |
| Mobile horizontal overflow | PASS | `document.scrollWidth - innerWidth = 0` |

## Real browser matrix

Chrome was run against the local Worker with controlled D1 fixtures at:

| Viewport | Week height | Month height | Month rows | Month scroll |
| ---: | ---: | ---: | ---: | --- |
| 1440x900 | 596px | 433px | 5 | none |
| 1440x800 | 596px | 433px | 5 | none |
| 1280x800 | 596px | 433px | 5 | none |
| 1024x768 | 596px | 433px | 5 | none |
| 820x1180 | 619px | 457px | 5 | none |
| 390x844 | 716px | 553px | 5 | none |

The 1440x900 Week, Month, expanded subscription and confirmation screenshots are generated under the ignored `test-results/phase-2.11/` evidence directory. The empty-month fixture measured 433px with five compact rows. The six-row August fixture measured 413px for its six-row body with no internal scroll.

## Commands

```text
npm test                 PASS — 14 files, 42 tests
npm run build            PASS
npm run test:browser     PASS
npm run test:browser:visual PASS — real Chrome geometry/contrast contract
CALENDAR_ZOOM=0.75 npm run test:browser:visual PASS — real Chrome zoomed contract
git diff --check         PASS
```

`npm run check` and `npm run test:production` pass locally. Production invalid-token feed checks return 404 for GET/HEAD/POST, unauthenticated admin/student feed routes redirect to Access, and remote D1 reports no migrations to apply. Production authenticated browser acceptance, feed ownership isolation and deployment remain NOT RUN for Phase 2.11.

## Acceptance method

The visual browser contract calculates relative luminance and WCAG contrast from the rendered `getComputedStyle(event).color` and `backgroundColor`, checks every rendered status event, checks event/text geometry, verifies the Month body's scrollbar and final-row bounds, and checks subscription overflow and collapsed height. Source-only class-existence checks are not treated as visual acceptance.
