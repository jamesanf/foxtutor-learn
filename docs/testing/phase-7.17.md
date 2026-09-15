# Phase 7.17 testing and evidence

## Student dashboard

Automated UI contracts cover:

- next scheduled lesson and last lesson dashboard summaries;
- the right-hand home-learning panel;
- the `None available` state;
- the `Submit here` link;
- responsive dashboard panel layout;
- time-of-day greeting and first-name fallback;
- compact exclamatory greeting without the former supporting caption;
- red under-30-minute launch notice, with and without an external lesson URL.
- shared page-title alignment with the first sidebar navigation button.
- footer placement at the browser bottom for short dashboards, without excess
  whitespace, and normal document scrolling for longer dashboards.
- outline navigation icons for Resources and Notifications, with filled shapes
  when selected.
- shared compact table columns and responsive headers that wrap at word
  boundaries without splitting words.
- Production FreeAgent contact-mapping actions remaining inside their table
  cell at reduced desktop widths, with the mobile stacked form preserved.
- accounting page Production FreeAgent card spacing matching the page heading
  rhythm and the other cards on the page.
- 25% smaller main page titles across standard, calendar, resource-upload and
  billing-settings heading variants.
- recurring-series Pause/Resume controls remaining centered in their table
  row with no default button top offset.
- mobile table pages retaining real columns in a horizontal scrolling
  container instead of converting rows into unusable stacked cards.

Table-page coverage includes the Accounting outbox and contact mappings,
notification log, lesson/student/resource lists, recurring series,
reschedules, billing health, invoice/credit detail and student billing
tables. The shared CSS contract is exercised once because every listed page
uses the same `.table-wrap`, `table`, `th` and `td` rules.

The dashboard reads only the authenticated student's own upcoming and past
lessons. The home-learning task is taken from the latest sent report, not a
draft report.

## Student submission route

Automated authorization and UI contracts cover the new
`student-lesson-submit` route and the lesson-scoped submission form. The
implementation reuses the resource upload validation path and disables the
student's own resource-added notification.

The route must remain protected by:

```text
active STUDENT session
→ findLessonForUser ownership predicate
→ sent-report/task availability check
→ CSRF validation
→ validated private resource upload
```

## Logout acceptance

Logout is a CSRF-protected `POST /learn/logout`. It deletes the user's D1
application sessions and clears the Learn session cookies. Because the
upstream identity provider can remain authenticated, the response also sets a
short-lived signed-out marker. The redirect must show a signed-out page rather
than immediately creating a new Learn session. The explicit `Sign in again`
link must provision a fresh session and clear the marker.

## Automated result

The complete suite passes:

```text
40 test files
281 tests
281 passed
0 failed
```

The TypeScript check and client build also pass. Authenticated Chromium
acceptance must verify the logout POST, redirect, signed-out state and
explicit resume path in addition to the dashboard and student submission
journeys. No real financial operation is part of this feature.
