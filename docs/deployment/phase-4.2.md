# Phase 4.2 deployment record

## Baseline

The implementation started from commit `751f0ad1516ad19fbdd3e983d44120db1c034a5c`,
remote `origin/main` at the same commit, Worker version
`7a037e99-84f8-4793-9e2c-195f22bf3882` recorded by the 4.1 release, and remote
migrations through `0007_notifications.sql`. No `phase-4-complete` tag existed.

## Release procedure

1. Run the full local gates.
2. Apply `0008_structured_lesson_reports.sql` remotely and inspect the
   student/report schema and indexes.
3. Deploy the Worker from the final commit.
4. Verify the deployed Worker version and remote commit/source correspondence.
5. Run controlled authenticated admin/student acceptance at desktop/mobile
   sizes, including report HTML and PDF ownership.
6. Run controlled Fox Mail acceptance for invitation, lesson created/changed,
   resource, reminder and lesson report events.
7. Inspect D1 and R2 after three PDF downloads: one report row and zero PDF
   objects.
8. Remove only the exact temporary fixtures and record their IDs/purpose.
9. Create `phase-4-complete` only when the worktree is clean and all evidence
   passes.

## Release result

Migrations `0008_structured_lesson_reports.sql` and
`0009_international_students.sql` were applied to the production database on
`2026-09-13`. The current deployed application release is `64a50e5`, synchronized with
`origin/main`, and is deployed as Worker version
`3ad03ca5-7ea1-42d1-bac5-e1c2b299bacd`. A remote migration check reports no
migrations pending. The release includes the report editor refinements,
start-only report time, compact auto-growing fields and lesson attachments
submitted with the report action through the existing resource/R2 pipeline.

The release also qualifies report columns in the student ownership
query, fixing the ambiguous-column path behind the student report 1101;
humanises sent timestamps, keeps ordinary reports on one PDF page and adds
inline FoxTutor email branding with structured feedback panels.

The deliverability refinement configures production notifications with
`MAIL_API_REPLY_TO=james@foxtutor.org`, so replies to Brevo-delivered
notifications reach the same support address shown in the report body. This
does not suppress Brevo-added tracking or unsubscribe infrastructure; those
remain provider-controlled.

Sent reports now have an admin-only Resend report action. Each resend uses a
new notification event while retaining the persisted report content and
attachments; an accepted resend updates the report's `sent_at` snapshot shown
in the report view and lesson history.

The final presentation pass adds no migration. Report Save draft, Send report
and Resend report now support an in-place JSON fragment response with a
redirect fallback, including a disabled spinner state and site notification.
Report email uses a spacious metadata panel, omits empty feedback sections,
removes duplicate pupil/footer content, adds the support contact and copyright
footer, and uses a FoxTutor Learn text link. Generated PDFs remain
single-page and now include the supplied transparent FoxTutor logo with a
PDF soft mask in the header.

The first authenticated report-send attempt reached Fox Mail but failed with
`400 invalid_recipient`. Production D1 inspection confirmed that both the
student profile email and linked active Learn user email were
`jamesanf@gmail.com`. The failure was in Learn's notification reload query:
delivery used `SELECT * FROM notifications`, which omitted the joined
recipient email and caused an empty `to` value. The query now joins the
linked user and returns `recipient_email`; the fix is deployed above.

The current local tree has passed the full automated suite, type-check/build,
Wrangler dry-run, browser shell contract and public production smoke checks.
Formal Phase 4 closure remains open because controlled authenticated
admin/student browser evidence, visual PDF inspection, real Fox Mail
acceptance, and the three-download D1/R2 no-storage check have not been
completed in this environment. Therefore no `phase-4-complete` tag has been
created.
