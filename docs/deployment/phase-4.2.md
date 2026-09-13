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

Migration `0008_structured_lesson_reports.sql` was applied to the production
database on `2026-09-13`. The final deployed source commit is
`71645829d48ad24f80b5f449459fa752bfd837fc`, deployed as Worker version
`50fe8696-610d-499e-90fa-57cf1194586b` at `2026-09-13T13:09:25Z`. The Worker
reports 100% traffic on that version.

Automated validation and unauthenticated production smoke checks pass. Formal
Phase 4 closure remains open because controlled authenticated admin/student
browser evidence, visual PDF inspection, real Fox Mail acceptance, and the
three-download D1/R2 no-storage check have not been completed in this
environment. Therefore no `phase-4-complete` tag has been created.
