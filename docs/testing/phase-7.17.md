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

## Automated result

The complete suite passes:

```text
40 test files
277 tests
277 passed
0 failed
```

The TypeScript check and client build also pass. Authenticated Chromium
acceptance of the new dashboard and a real student submission remains a
post-deployment browser check; no real financial operation is part of this
feature.
