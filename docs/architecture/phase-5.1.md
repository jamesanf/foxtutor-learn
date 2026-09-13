# Phase 5.1 — Cancellation, exceptions, rescheduling and billing classification

## Scope

Phase 5.1 encodes the operational lesson-change rules without adding an
accounting provider integration. The existing Phase 4 notification outbox and
Fox Mail boundary remain the only outbound notification path.

The authoritative student timing policy is:

| Time before lesson start | Student action |
|---|---|
| More than 24 hours | Cancel or reschedule directly |
| Exactly 24 hours | Normal cancellation/rescheduling blocked; exception request is required for cancellation |
| Less than 24 hours | Normal cancellation/rescheduling blocked; cancellation exception request is available |
| Started, completed or cancelled | No student cancellation/rescheduling action |

The calculation uses the stored UTC `lessons.start_at` instant and server time.
The browser only renders the result and never supplies the clock, eligibility,
student identity or actor identity.

## State and history

The lesson lifecycle remains `scheduled`, `completed` and `cancelled`.
Cancellation requests are separate records with `PENDING`, `APPROVED` and
`REJECTED` states. Immutable `lesson_history` rows record:

- normal student cancellation;
- cancellation request submission and decision;
- administrative cancellation;
- each reschedule, including previous and new UTC times and timezone.

The same lesson ID is retained during rescheduling so resources, reports,
calendar UIDs and authenticated URLs remain attached to the lesson.

## Billing boundary

Phase 5 stores a deterministic operational classification on the history row:

| Event | Classification |
|---|---|
| Student cancellation over 24 hours | `NO_CHARGE` |
| Pending exception request | `CANCELLATION_PENDING_DECISION` |
| Approved exception | `EXCEPTION_WAIVED` |
| Administrative cancellation | `ADMIN_CANCELLED` |
| Reschedule | `RESCHEDULED` |

These values are not sent to FreeAgent in Phase 5. Phase 6 may consume them
through a future outbox/integration boundary.

## Mutation guarantees

State transitions use conditional D1 updates and immutable history inserts.
Repeated cancellation, request, approval, rejection or reschedule submissions
produce no second logical transition. Notification delivery is persisted in the
existing Phase 4 outbox and is independent of the committed lesson mutation.

All mutation routes use the existing session, role, ownership and CSRF
controls. Student ownership is resolved through the authenticated user and an
active linked student record.
