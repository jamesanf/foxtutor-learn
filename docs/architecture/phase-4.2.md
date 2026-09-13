# Phase 4.2 structured lesson reports

## Authoritative model

`lesson_reports` remains the dedicated D1 entity and remains unique per lesson.
The report is the authoritative structured record; HTML, Fox Mail and PDF are
projections of that record.

| Template field | D1 field |
|---|---|
| Lesson Date | `lesson_date` snapshot |
| Pupil | `pupil_name` snapshot |
| Level | `level` snapshot |
| This Lesson's Focus | `this_lessons_focus` |
| Next Lesson's Focus | `next_lessons_focus` |
| Writing Practice | `writing_practice` |
| Home Learning Task | `home_learning_task` |
| Notes | `notes` |
| Even Better If | `even_better_if` |

The 4.1 fields remain in the schema for forward compatibility and are
reconciled by migration `0008_structured_lesson_reports.sql`:
`summary -> this_lessons_focus`, `homework -> home_learning_task` and
`additional_notes -> notes`.

## Snapshots and lifecycle

`students.level` is the nullable canonical current level. A report snapshots
the pupil name, level, lesson local date, lesson start/end instants and IANA
timezone when its row is first created. Drafts can be edited; a sent report is
not editable through the normal route. Only completed lessons are reportable,
and one report is allowed per lesson.

Save Draft persists structured content without student visibility or a report
notification. Send validates the level and lesson focus, persists the final
content, creates the deterministic `lesson-report:<report-id>` notification,
and changes the report to `SENT` only when the existing provider acceptance
path marks the notification `SENT`. Failed/unknown mail retains the draft and
the notification state.

## Views and access

Admins use `/learn/admin/lessons/<lesson-id>/report`; students use
`/learn/student/lessons/<lesson-id>/report`. Student SQL resolves the current
active STUDENT account to its linked student and returns a generic 404 unless
the requested lesson has a sent report. Lesson history uses one joined report
query, exposing report actions without N+1 lookups. Student views never expose
drafts or admin controls.

## PDF

`src/reports/pdf.ts` is a small Worker-compatible deterministic renderer. It
creates the two-page branded header/Tutorial Feedback structure with a stable
core font, borders, footer and page numbering. The endpoint regenerates the
PDF from the persisted report, uses `Content-Type: application/pdf`,
`Content-Disposition: attachment`, `private, no-store`, `nosniff` and the
same authorization predicates as the HTML route. It never writes an R2 object
or D1 blob.

The renderer uses an explicit fixed `© 2026 Fox Learning Ltd. All rights
reserved.` footer policy matching the supplied template. Long text is wrapped
inside the feedback cells; the implementation must be visually inspected
before production closure.
