# Student dashboard and home-learning submissions

## Dashboard data

The authenticated student dashboard is server-rendered from the student's
owned lesson data. It displays:

- the next scheduled lesson;
- the most recent non-cancelled past lesson; and
- the latest sent report's home-learning task, when one exists.

Draft reports are never used for the student dashboard. A report must be
sent, and the report lookup remains subject to the existing student ownership
and active-account predicates.

The two lesson summaries link to the existing student lesson-detail route.
The home-learning panel displays `None available` when the latest sent report
has no task.

The dashboard heading uses the student's first name, taking the first word of
the linked pupil name when no separate first-name field exists. The greeting
is selected in `Europe/London` time, ends with an exclamation mark, and uses a
compact heading size without a supporting caption:

```text
05:00–11:59  Good morning
12:00–17:59  Good afternoon
18:00–21:59  Good evening
22:00–04:59  Good night
```

When the next scheduled lesson starts in fewer than 30 minutes, the next
lesson card displays a red launch notice. If the lesson has an external lesson
URL, the notice links directly to it; otherwise the same notice is rendered as
plain text without a hyperlink.

The four dashboard cards use matching two-column widths on desktop and stack
into one column on narrow screens.

## Student submissions

When a sent report contains a home-learning task, the dashboard provides a
`Submit here` link to:

```text
/learn/student/lessons/{lesson-key}/submit
```

The route is lesson-scoped and student-authorized. It accepts the existing
private resource file allowlist (PDF, DOCX, TXT, PNG, JPEG and WEBP) and
reuses the established R2/D1 resource pipeline, including:

- Learn-session and CSRF validation;
- ownership checks through `findLessonForUser`;
- file signature and size validation;
- the per-lesson storage limit;
- upload idempotency;
- private resource storage and authenticated downloads.

The uploaded file is associated with the lesson and the student account. It
does not send the student a resource-added email about their own submission.
Successful retries use the student submission success page rather than an
administrator resource page.

Student submissions do not create a new assignment subsystem. They use the
existing lesson resource model so tutor review, retention and private access
remain in one auditable storage path.
