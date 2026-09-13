# Phase 5.1 — Testing and acceptance

## Automated coverage

The Phase 5.1 suite covers:

- the strict `>24h` cancellation boundary, including exactly 24 hours and
  23h59m;
- started, completed, cancelled and malformed lessons;
- finite billing classifications and bounded cancellation reasons;
- role classification for student and admin mutation routes;
- migration contracts for cancellation history and notification vocabulary;
- existing calendar, iCalendar, notification, security and UI contracts.

Run the repository checks with:

```sh
npm test
npm run build
npm run check
npm run test:browser
npm run test:production
git diff --check
```

## Acceptance matrix

| Area | Required result |
|---|---|
| Normal cancellation | Eligible student sees confirmation; final POST rechecks server policy and immediately cancels |
| Late cancellation | Student submits one pending request; lesson remains scheduled until an admin decision |
| Decision | Authorized admin approval cancels and classifies; rejection leaves the lesson scheduled |
| Rescheduling | Future server-validated time, no student overlap, same lesson ID and immutable history |
| Authorization | Wrong student, inactive student, student admin actions and forged IDs are denied |
| CSRF | All state-changing cancellation and reschedule forms require the existing token |
| Join access | Cancelled lessons remain historical but do not expose a join action |
| Calendar/feed | Cancellation and current rescheduled time are reflected without a replacement lesson |
| Notifications | Existing Phase 4 outbox is used with deterministic business identities |
| Reminders | Cancellation suppresses the reminder; rescheduling gets a new occurrence without duplicating legacy reminders |
| Responsive UI | Student actions, admin queue and history remain usable at desktop and mobile widths |

Production acceptance must use controlled fixtures and remove them after
verification. No acceptance fixture should remain in production data.

The available environment completed all automated checks, the browser/static
contract and unauthenticated production perimeter checks. Authenticated
workflow and real-mail acceptance remain an explicit release gate because the
production Learn routes are behind Cloudflare Access and no authenticated test
session was available.
