# Phase 2.1 architecture

Phase 2.1 adds the first tutoring-management domain without changing the Phase 1 perimeter. Cloudflare Access still authenticates the request, the Worker resolves an active Learn user and server-side session, and role authorization runs before every application handler.

## Student model

`students` is a tutoring record, not a second authentication system. Each record has a stable UUID, name, contact email, active/inactive status and timestamps. `learn_user_id` is nullable and must be linked explicitly by an administrator to an existing active `STUDENT` Learn user. A matching contact email alone never grants access. The unique link prevents one Learn identity from owning multiple student records.

Deactivation changes the student record to `INACTIVE`; it does not delete history. Student ownership queries require both an active student record and an active `STUDENT` Learn user.

## Lesson model

`lessons` has a stable UUID, a required student foreign key, UTC ISO `start_at` and `end_at` instants, the original IANA `timezone`, lifecycle `status`, plain-text private `notes`, optional HTTPS `external_url`, and timestamps. The schema intentionally does not include recurrence, calendar-provider identifiers, billing, attendance analytics or resources.

The Worker converts a submitted local `datetime-local` value and IANA timezone into a deterministic UTC instant. It rejects invalid or nonexistent local times and requires the end instant to be after the start instant. Display converts the stored instant back using the stored timezone; server or browser local timezone is never authoritative.

## Authorization and privacy

Admin routes use the existing `ADMIN` role and can manage student and lesson records. Student routes use the existing `STUDENT` role and only query lessons through a join from the authenticated Learn user to its explicitly linked active student record. A lesson detail lookup includes the authenticated user predicate in SQL before any row is returned. Student queries omit notes; admin-only notes are never rendered in student responses.

All mutations remain server-side form posts protected by the existing CSRF token. Request bodies are bounded, fields are validated, external URLs must be HTTPS without embedded credentials, and lesson status changes use an explicit transition rule: scheduled may remain scheduled or become completed/cancelled; terminal states cannot be changed to a different state.

## Routes

```text
/learn/admin
/learn/admin/students
/learn/admin/students/new
/learn/admin/students/:id
/learn/admin/students/:id/edit
/learn/admin/students/:id/deactivate
/learn/admin/lessons
/learn/admin/lessons/new
/learn/admin/lessons/:id
/learn/admin/lessons/:id/edit
/learn/admin/lessons/:id/status

/learn/student
/learn/student/lessons
/learn/student/lessons/:id
```

The UI is chronological and deliberately does not add a calendar, recurrence editor, availability system, notifications or public student pages.

## Migration and conflict handling

`migrations/0002_students_lessons.sql` is forward-only and leaves `0001_foundation.sql` unchanged. Foreign keys protect student references and indexes support student ownership, active-state administration and chronological lesson queries. The overlap query uses `new_start < existing_end AND new_end > existing_start` for the same student and ignores cancelled lessons; create and edit reject an active overlap.
