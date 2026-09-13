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
| Home Learning Task | `home_learning_task` |
| Notes | `notes` |
| Even Better If | `even_better_if` |

The 4.1 fields remain in the schema for forward compatibility and are
reconciled by migration `0008_structured_lesson_reports.sql`:
`summary -> this_lessons_focus`, `homework -> home_learning_task` and
`additional_notes -> notes`.

The report form uses a custom type-and-suggest level control with the current
student level as its initial value. The most common suggestions currently lead
with GCSE English and Higher ESOL; arbitrary new levels are allowed. Saving a
draft or sending a report writes the selected level back to `students.level`.
Feedback fields start in bullet mode and support toggling between plain text,
bullets and numbered lists, plus bold (`**text**`) and yellow highlight
(`==text==`) through a contextual toolbar that appears while a field is
focused. Notes are optional and collapsed by default. Fields start compactly
and grow automatically as content is entered.

## Snapshots and lifecycle

`students.level` is the nullable canonical current level.
`students.international` is an opt-in communication preference and is not used
for authorization. A report snapshots
the pupil name, level, lesson local date, lesson start/end instants and IANA
timezone when its row is first created. Drafts can be edited; a sent report is
not editable through the normal route. Report entry becomes available after
the lesson start time, while student visibility remains gated by completion
and sent status. One report is allowed per lesson.

Save Draft persists structured content without student visibility or a report
notification. Once a lesson's UK start time has passed and it is not
cancelled, the report action is available; the scheduled Worker also marks
lessons completed after their end time. Send validates the level and lesson
focus, persists the final content, creates the deterministic
`lesson-report:<report-id>` notification, and changes the report to `SENT`
only when the existing provider acceptance path marks the notification `SENT`.
Failed/unknown mail retains the draft and the notification state.

The report workflow includes a contextual drag-and-drop attachment area inside
the primary report form. The selected file is submitted with the Send report action; the Worker waits
for the existing multipart validation, D1 metadata and R2 storage pipeline to
complete before sending the report.
The same resource notification and idempotency behavior is retained, and the
file appears in the existing admin and student lesson resource views without
a second attachment system or a separate upload page.

Report Save draft, Send report and admin Resend report use an additive
fragment interaction. The client submits the existing multipart form with
`X-Report-Fragment: 1`, disables the clicked action with a grey spinner, and
updates the report section and site notification from the JSON response. A
normal form submission remains available as a redirect fallback when
JavaScript is unavailable.

The scheduled Worker sends one idempotent `DST_WARNING` notification at 09:00
UK time on the last Sunday in March and October to active students with the
international preference enabled. The message says that all lessons remain
scheduled in UK time and asks the recipient to check their own time difference.

## Views and access

Admins use `/learn/admin/lessons/<lesson-id>/report`; students use
`/learn/student/lessons/<lesson-id>/report`. Student SQL resolves the current
active STUDENT account to its linked student and returns a generic 404 unless
the requested lesson has a sent report. Lesson history uses one joined report
query, exposing report actions without N+1 lookups. Student views never expose
drafts or admin controls.

## PDF

`src/reports/pdf.ts` is a small Worker-compatible deterministic renderer. It
creates a compact single-page branded header/Tutorial Feedback structure with
a stable core font, borders, footer and page numbering. The report metadata
displays the lesson start time only. The endpoint regenerates the
PDF from the persisted report, uses `Content-Type: application/pdf`,
`Content-Disposition: attachment`, `private, no-store`, `nosniff` and the
same authorization predicates as the HTML route. It never writes an R2 object
or D1 blob.

The renderer uses a dynamically dated `© <current year> Fox Learning Ltd. All
rights reserved.` footer matching the supplied template. Long text is wrapped within the
feedback cells and the renderer reduces the line scale when needed to retain
the one-page format. The supplied FoxTutor logo asset is embedded in the
top-left header as a JPEG XObject loaded from the Worker asset bundle; PDFs do
not use a separate R2 object.

## Email presentation

Lesson-report email is an inline-styled FoxTutor Learn message designed for
Fox Mail/Brevo and Gmail clients. The lesson date, start/end time and level
use a single spacious metadata panel; the recipient's pupil name is not
repeated in that panel. Empty feedback fields are omitted, duplicate bullet prefixes are normalised, and the
call to action is the text link “View this report on FoxTutor Learn”. The
support sentence appears in the main content rather than the footer, while the
footer contains one dynamically dated copyright line. Notification delivery
also supplies `Reply-To: james@foxtutor.org`, matching the support address in
the message body and giving recipients a direct reply path.

### Brevo deliverability boundary

The production mail path remains Fox Mail with Brevo as the required outbound
provider. Brevo may add its own return-path, tracking, unsubscribe and
provider-classification headers; Learn does not attempt unsupported header
overrides. Learn-side mitigations are limited to authenticated domain
alignment, a consistent sender/reply address, a plain-text alternative, and
the minimum application links required by the report. Gmail inbox placement
remains reputation- and recipient-dependent.
