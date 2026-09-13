# Phase 5.1 — Security and privacy controls

Phase 5.1 keeps the existing private Learn security model and applies it to
all cancellation and rescheduling mutations.

- Student routes resolve ownership from the authenticated session user to an
  active linked student record; submitted student IDs are not trusted.
- Admin queue, approval, rejection, direct cancellation and administrative
  rescheduling are role-protected.
- Every state-changing route requires the existing session and CSRF checks.
- Lesson, request and history identifiers are scoped through server-side
  ownership or admin authorization before records are rendered or mutated.
- Cancellation reasons are capped at 1,000 characters, reject control
  characters and are HTML-escaped on render.
- Reasons are operational tutor data and are not included in public or
  cross-student output.
- Cancelled lessons remain accessible for history but do not expose their
  external join action.
- Billing classifications are operational data only. Phase 5 does not call
  FreeAgent, payment APIs or accounting providers.
- Notification content uses the existing Fox Mail boundary and does not expose
  internal audit IDs or private reasons to students.
