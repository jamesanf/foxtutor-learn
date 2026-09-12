# Phase 3.2 deployment record

Date: 2026-09-13

## Release boundary

Phase 3.2 changes the Learn resource UI and application-level metadata projection only. It does not create a migration, change the private R2 bucket, alter storage keys, or change resource authorization and validation.

The `category` column from `0004_resources.sql` is retained as an unused legacy column for schema compatibility. No D1 migration is required because no deployed data contract depends on the application field.

## Required release sequence

1. Run the local unit/integration/security and browser contracts.
2. Run the build and Wrangler dry-run.
3. Commit the exact source and generated client asset.
4. Push the release commit.
5. Deploy that exact commit to the existing `foxtutor-learn` Worker.
6. Verify generic, student-context and lesson-context Add Resource flows with controlled fixtures.
7. Verify category absence, resource security, list/detail behavior and R2/D1 cleanup.
8. Remove exact fixtures, confirm a clean working tree, then create `phase-3.2-complete` only after every gate passes.

Production acceptance is not claimed by this record until the authenticated browser and controlled-fixture checks are actually completed.
