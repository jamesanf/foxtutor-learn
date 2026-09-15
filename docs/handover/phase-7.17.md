# Phase 7.17 handover

## Delivered

- Student dashboard cards for the next scheduled and last lesson.
- Time-of-day first-name greeting.
- Red near-term lesson launch notice, linked only when a lesson URL exists.
- Right-hand home-learning panel using the latest sent lesson report.
- Explicit `None available` state when no task exists.
- Lesson-scoped `Submit here` flow for student home-learning uploads.
- Existing private resource validation, ownership, CSRF and idempotency
  protections retained.

## Safety boundary

Student uploads are stored as private lesson resources. The student can only
submit against a lesson returned by the authenticated ownership query, and a
student's own submission does not trigger the tutor-resource email intended
for tutor-created resources.

## Acceptance required

Use authenticated Chromium after deployment to verify the dashboard and submit
one controlled non-financial fixture file. Confirm that the submission appears
only in the owning student's lesson/resource surface and is not available
through another student's route.

## Deployment provenance

- Git commit: `673c1596494610218fc25d065f0b276eac8241f1`
- Worker version: `e3086fa8-b0ff-4b65-a0e8-bccdc8187125`
- Production routes: `foxtutor.org/learn` and `foxtutor.org/learn/*`
