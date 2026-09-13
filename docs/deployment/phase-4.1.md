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
| Source commit | Pending final release commit |
| Remote commit | Pending final push |
| Worker version | Pending deployment |
| Migrations | Applied and verified locally through `0007_notifications.sql` |
| Cron | `*/5 * * * *` in Wrangler configuration |
| Mail provider | Existing Fox Mail adapter only |
| Production mail acceptance | Blocked: Fox Mail production internal secret/service-auth prerequisite is documented as unavailable |
| Production report/reminder acceptance | Not claimed |
| Public repository/site changes | None |
| Completion tag | Not created |

No production mail test is represented by the local mock. A real delivery
requires the existing Fox Mail boundary to be operational first.
