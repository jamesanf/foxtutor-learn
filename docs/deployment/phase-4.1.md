# Phase 4.1 deployment record

## Intended deployment sequence

1. Apply forward-only migrations `0006_lesson_reports.sql` and
   `0007_notifications.sql` to the Learn D1 database.
2. Deploy the Worker with the five-minute cron trigger and existing
   `MAIL_API_*` bindings.
3. Confirm the deployed source commit equals `origin/main`.
4. Run public/private route smoke checks without changing the public site.
5. Run authenticated admin/student acceptance for invitation, lesson,
   resource, notification visibility and report workflows.
6. Run one controlled production mail success/idempotency test and remove its
   exact fixture.

## Current record

| Field | State |
|---|---|
| Source commit | `638bc2823fdcee0b021733c41a3b76ca3a531fe5` |
| Remote commit | `638bc2823fdcee0b021733c41a3b76ca3a531fe5` |
| Worker version | `ee699d26-504f-4a1e-81e4-862e7af121cb` |
| Deployment time | `2026-09-13T12:42:54Z` |
| Migrations | `0006_lesson_reports.sql` and `0007_notifications.sql` applied remotely and verified |
| Cron | `*/5 * * * *` in Wrangler configuration |
| Mail provider | Existing Fox Mail adapter only |
| Production mail acceptance | Not claimed: no controlled authenticated production fixture/browser session was available |
| Production report/reminder acceptance | Not claimed; local deterministic coverage and deployed scheduler are present |
| Browser visual acceptance | Not run: existing visual harness requires a local Chrome DevTools session on `127.0.0.1:9222` |
| Public repository/site changes | None |
| Completion tag | Not created |

No production mail test is represented by the local mock. A real delivery
requires the existing Fox Mail boundary to be operational first.
