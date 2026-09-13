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
`2026-09-13`. The current deployed source commit is `5a795be`, synchronized
with `origin/main`, and is deployed as Worker version
`5194a769-d6cd-4edb-83c4-9e911ddbff6d`. A remote migration check reports no
migrations pending. The release includes the report editor refinements,
start-only report time, compact auto-growing fields and lesson attachments
submitted with the report action through the existing resource/R2 pipeline.

The current local tree has passed the full automated suite, type-check/build,
Wrangler dry-run, browser shell contract and public production smoke checks.
Formal Phase 4 closure remains open because controlled authenticated
admin/student browser evidence, visual PDF inspection, real Fox Mail
acceptance, and the three-download D1/R2 no-storage check have not been
completed in this environment. Therefore no `phase-4-complete` tag has been
created.
