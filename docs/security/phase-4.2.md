# Phase 4.2 report security

- `students.level` is profile data only and is never used for authorization.
- Report snapshots preserve historical pupil, level and lesson metadata; they
  do not dynamically inherit later student/lesson edits.
- Admin report creation/edit/send routes retain the existing session, role and
  CSRF checks. Sent reports are not ordinarily editable.
- Student HTML and PDF routes require an active STUDENT user, the linked active
  student record, the requested lesson and a sent report. Unauthorized or
  draft reports return a generic 404.
- PDF responses are private/no-store, `nosniff`, non-indexable and generated
  from authoritative D1 data. No PDF bytes are stored in R2 or D1.
- Report body text is escaped in HTML/email and is not logged. Email contains
  the student-visible projection and an authenticated report URL, not private
  lesson notes, internal IDs or storage keys.
- Mail failures retain the D1 report draft and durable notification state;
  unknown provider outcomes reuse the existing notification/provider
  idempotency identity.
