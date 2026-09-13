# Phase 4.2 testing and acceptance

## Automated coverage

- Migrations `0008` and `0009` add nullable `students.level`, the opt-in
  `students.international` preference, structured report fields, snapshot
  columns, reconciliation updates and report indexes.
- Route classification covers admin/student report HTML and PDF endpoints.
- The report projection uses persisted pupil, level, date/time and all six
  feedback fields.
- Email templates use the exact template labels, escaped values and the
  authenticated report link.
- PDF tests verify `%PDF-1.4`, the header, Tutorial Feedback labels and
  deterministic report data.
- Existing notification, Fox Mail, reminder, ownership and privacy tests
  remain unchanged and pass.
- UK clock-change date/time detection and the `DST_WARNING` email projection
  are covered by unit tests.

## Executed validation

The final pushed tree passed:

```text
npm test                 79 tests across 19 files
npm run build            PASS
npm run check            PASS
npm run test:browser     PASS (static shell contract)
npm run test:production  PASS (public/unauthenticated smoke)
git diff --check         PASS
```

Production D1 reports no migrations pending after applying `0009`. Production
deployment and unauthenticated smoke are confirmed, but the acceptance matrix
below still requires authenticated browser, Fox Mail, PDF visual and
no-storage evidence before closure.

## Required acceptance matrix

| Capability | Required evidence |
|---|---|
| Student level | Admin edit, nullable existing records, report snapshot |
| Report draft | D1 structured content, no student visibility/email |
| Report send | One notification, provider acceptance, `SENT` and `sent_at` |
| Student history | Completed lessons show only sent report actions |
| Admin history | Create/Edit/View actions appear in Past Lessons |
| Admin report queue | Started lessons appear on the admin Dashboard with Create/Edit report actions |
| Automatic lifecycle | Scheduled lessons become completed after their end time; report entry is available from lesson start |
| International preference | Admin can opt a student in/out; default is off |
| DST warning | One 09:00 UK-time reminder on each UK clock-change date, with idempotent delivery |
| Student isolation | Student A cannot open Student B HTML or PDF |
| PDF | Genuine two-page visual output, no R2/D1 PDF storage |
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

The current source pass does not claim authenticated production mail,
Chromium screenshots, real-recipient delivery, PDF visual inspection or
post-deployment acceptance.
