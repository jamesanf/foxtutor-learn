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

- Git commit: `bde4a183fb786e5c0af51a4ff9fee96f25c21600`
- Worker version: `b972ac5b-46d2-4a30-ba57-a8ab8ae7daa7`
- Production routes: `foxtutor.org/learn` and `foxtutor.org/learn/*`
