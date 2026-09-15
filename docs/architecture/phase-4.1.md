# Phase 4.1 notification and reporting architecture

> This is the historical Phase 4.1 baseline. The current structured report,
> lifecycle, level and attachment model is documented in
> [`phase-4.2.md`](phase-4.2.md).

## Scope

Phase 4.1 adds routine operational email without changing the public FoxTutor
site, its routes, DNS, sitemap, robots policy or Worker. Learn remains at
`/learn` and uses the existing server-side Fox Mail boundary.

The implementation is deliberately small:

```text
trusted Learn mutation
  -> typed notification draft
  -> D1 notification outbox row
  -> Fox Mail adapter
  -> delivery state/provider reference
```

Lesson reports are a separate `lesson_reports` table because tutor-authored
student-facing content must not be mixed into private lesson notes.

## Event matrix

| Business operation | Event | Recipient | Identity | Template |
|---|---|---|---|---|
| Active student record created | `STUDENT_INVITED` | Linked active STUDENT user | `student:<id>` | Welcome |
| Scheduled lesson committed | `LESSON_CREATED` | Lesson's linked student | `lesson-created:<lesson-id>` | Lesson booked |
| Student-visible lesson fields changed | `LESSON_CHANGED` | New linked student | Stable old/new lesson-value event | Lesson updated |
| Lesson is within reminder window | `LESSON_REMINDER` | Lesson's linked student | `lesson-reminder:<lesson-id>:15m` | Reminder |
| Resource reaches `available` | `RESOURCE_ADDED` | Resource's linked student | `resource-added:<resource-id>` | New resource |
| Existing status transition to cancelled | `CANCELLATION_PROCESSED` | Lesson's linked student | `cancellation-processed:<lesson-id>` | Lesson cancelled |
| Completed lesson report send | `LESSON_REPORT` | Lesson's linked student | `lesson-report:<report-id>` | Lesson report |

`CANCELLATION_REQUESTED` is part of the finite contract and template vocabulary
but remains dormant because the current application has no student
cancellation-request workflow. Phase 5 owns that business domain.

## D1 state

`notifications` is the one Learn outbound delivery model. It stores the
business event identity, recipient references, related lesson/resource/report,
typed event, subject, durable text/HTML projection, idempotency key, attempt
metadata, safe failure category and provider reference. The durable rendered
body is intentional: retries must send the same report/resource projection
without copying Fox Mail's provider database or transport state into Learn.

The state machine is:

```text
PENDING -> SENDING -> SENT
                    -> FAILED
                    -> UNKNOWN
PENDING -> SUPPRESSED
```

`UNKNOWN` means the request may have reached Fox Mail (for example, a timeout).
The same notification ID and provider `Idempotency-Key` are retained for later
reconciliation. `FAILED` is used when Learn knows the provider rejected or did
not accept the request. Retryable categories are rate limit, provider
unavailable and timeout; permanent categories remain visible to the admin.
Stale `SENDING` claims become `UNKNOWN` rather than creating another event.
`SUPPRESSED` records a notification disabled by an administrator. It remains in
the same outbox so the operational log explains why an expected message was
not sent.

The `notification_settings` table is the forward-looking control plane for the
outbox. Admins can enable or suppress future event types and adjust reminder
lead time or delivery delay. Email wording remains owned by the notification
templates; the admin console provides an authenticated rendered preview rather
than an ad hoc message editor. Settings are applied when a future row is
created; historical rows keep their original rendered subject and body.

The database unique constraint on `idempotency_key` is the final duplicate
protection. Provider delivery uses `notification:<notification-id>` and never
generates a new key for an attempt.

## Delivery-log sorting, pagination and retention

Learn list views use the same server-rendered `paginationControls` helper and
compact pager styling. It presents only previous/next arrow controls and a
`Page X of Y` label, with the notification delivery log using the same markup
and adding its existing no-reload fragment behavior. Notification delivery-log
headers sort the server-side result set by event, recipient, pupil, lesson,
status, scheduled time, sent time or created time. The default is sent time,
most recent first, with unsent records after sent records. The log exposes at
most ten pages for the selected page size.

Completed notification history is retained to the latest 480 records, which is
ten pages at the largest available page size. The scheduled Worker cleanup
prunes older `SENT`, `FAILED` and `SUPPRESSED` rows daily at 03:00
Europe/London. Active or unresolved `PENDING`, `SENDING` and `UNKNOWN` rows are
not deleted.

## Reminders

The current product policy is one reminder, 15 minutes before a scheduled lesson,
configurable from the admin notification controls.
Cloudflare invokes the Worker every five minutes. The scheduler queries only
active, linked students and upcoming scheduled lessons inside a seven-day
pipeline window, creates the deterministic reminder row with an indexed unique key, and
delivers it. Cancelled, completed, elapsed and inactive-student lessons are
excluded. A missed scheduler run does not send a stale reminder after the
lesson has started.

## Reports

Admins can report only completed lessons. A report has `DRAFT` and `SENT`
states, is unique per lesson, and contains summary, homework/follow-up and
additional student-facing notes. The first send creates the canonical
`LESSON_REPORT` notification. A sent report is immutable through the normal
route; page reloads and duplicate submissions reuse its idempotency identity.
Resources are represented as authenticated Learn links, never R2 URLs or
object keys.

## Authorization and links

Recipients are resolved server-side through:

```text
lesson/resource -> student -> active linked STUDENT user -> user email
```

No client-supplied recipient, subject, event type or notification endpoint
exists. Admin notification and report routes use the existing session, role and
CSRF controls. All Learn links use the configured canonical origin and remain
behind the existing Access/session authorization boundary.

The notification console keeps the delivery log paginated and supports
authenticated, rendered HTML previews for both notification templates and
individual historical outbox rows. Delivery timestamps shown in the console
are formatted in the configured UK calendar timezone; stored UTC values remain
the source of truth. The delivery log pager is intentionally compact and
renders as a small responsive capsule with in-place page updates.

HTML template values are escaped; private lesson notes, tokens, IDs and
provider credentials are not included in student messages.
