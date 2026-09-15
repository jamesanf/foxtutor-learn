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

- Git commit: `d7dd28a2efe6810227856a240462799169d12334`
- Worker version: `56230c69-b7b5-4b1f-a12d-ea7ed976dd87`
- Production routes: `foxtutor.org/learn` and `foxtutor.org/learn/*`
