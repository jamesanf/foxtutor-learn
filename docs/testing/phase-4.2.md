# Phase 4.2 testing and acceptance

## Automated coverage

- Migrations `0008` and `0009` add nullable `students.level`, the opt-in
  `students.international` preference, structured report fields, snapshot
  columns, reconciliation updates and report indexes.
- Route classification covers admin/student report HTML and PDF endpoints.
- The report projection uses persisted pupil, level, date/time and all five
  feedback fields.
- Email templates use the exact template labels, escaped values and the
  authenticated report link.
- Rich report formatting is escaped and projected for bold, bullets, numbered
  lists and yellow highlights; Writing Practice is not rendered.
- The report editor defaults to bullet mode, supports list-mode toggling,
  compact auto-growing fields and uses the existing resource upload route for
  lesson-associated attachments.
- PDF tests verify `%PDF-1.4`, the header, Tutorial Feedback labels,
  deterministic report data and a single `/Type /Page` object.
- Student report query coverage verifies that report columns are qualified
  across the lesson/student/user ownership joins, preventing the production
  Cloudflare 1101 caused by ambiguous SQLite column names.
- Report email coverage verifies inline FoxTutor branding, styled feedback
  panels, a clear report CTA and safe rich-text projection.
- Report delivery coverage verifies that a sent report can be resent with a
  fresh notification event and that successful resend updates `sent_at`.
- Reactive report-action coverage verifies that Save draft, Send report and
  Resend report submit a fragment request, expose a loading state and update
  the report section without page navigation.
- Email presentation coverage verifies that empty fields are omitted, pupil
  metadata is not duplicated, duplicate bullet prefixes are normalised, the
  contact/copyright footer is present and the FoxTutor Learn text link is used.
- PDF coverage verifies the self-contained vector FoxTutor mark in the
  single-page header.
- Existing notification, Fox Mail, reminder, ownership and privacy tests
  remain unchanged and pass.
- UK clock-change date/time detection and the `DST_WARNING` email projection
  are covered by unit tests.

## Executed validation

The final application tree at `e153389` passed:

```text
npm test                 87 tests across 19 files
npm run build            PASS
npm run check            PASS
npm run test:browser     PASS (static shell contract)
npm run test:production  PASS (public/unauthenticated smoke)
git diff --check         PASS
```

Production D1 reports no migrations pending after applying `0009`. The
application release `e153389` is deployed as Worker
`a674e5fa-13c6-43bb-8cc5-1e7861d36a65`. Production deployment and
unauthenticated smoke are confirmed. A production notification regression check
also confirmed that delivery reloads the linked recipient email rather than
sending an empty recipient.
Authenticated browser, successful Fox Mail, PDF visual and no-storage evidence
are still required before closure.

## Required acceptance matrix

| Capability | Required evidence |
|---|---|
| Student level | Admin edit, nullable existing records, report snapshot |
| Report draft | D1 structured content, no student visibility/email |
| Report send/resend | Initial and repeat sends create delivery events, provider acceptance updates `SENT` and the latest `sent_at` |
| Student history | Completed lessons show only sent report actions |
| Admin history | Create/Edit/View actions appear in Past Lessons |
| Admin report queue | Started lessons appear on the admin Dashboard with Create/Edit report actions |
| Automatic lifecycle | Scheduled lessons become completed after their end time; report entry is available from lesson start |
| International preference | Admin can opt a student in/out; default is off |
| DST warning | One 09:00 UK-time reminder on each UK clock-change date, with idempotent delivery |
| Lesson attachments | Report workflow uses the existing resource/R2 pipeline and attaches files to the relevant lesson |
| Student isolation | Student A cannot open Student B HTML or PDF |
| PDF | Genuine single-page visual output, no R2/D1 PDF storage |
| Long content | No clipping, overlap or truncation in HTML/email/PDF |
| Snapshot | Name/level/lesson metadata remain stable after source edits |
| Regression | Invitations, lesson events, resources, cancellation and reminders |

Before closure run:

```sh
npm test
npm run build
npm run check
npm run test:browser
npm run test:production
git diff --check
```

The current source pass does not claim successful authenticated production mail,
Chromium screenshots, real-recipient delivery, PDF visual inspection or
post-deployment acceptance.
