# Phase 3.3 deployment record

Date: 2026-09-13

## Release boundary

Phase 3.3 changes the resource manager query/UI layer, adds the admin bulk-delete route, makes Open/Download disposition explicit and adds the server-side per-lesson aggregate allowance. It does not change the private R2 binding, object namespace, D1 resource schema, ownership predicates, upload validation or idempotency model.

No new migration is required. The legacy D1 column from `0004_resources.sql` remains unused for schema compatibility.

## Operational decisions

- PDF compression: **DEFERRED WITH DOCUMENTED TECHNICAL REASON** because no verified private asynchronous processing binding exists in this repository.
- Retention housekeeping: **DEFERRED WITH DOCUMENTED OPERATIONAL DECISION**; `retention_until` is a review horizon and active learning material is not automatically deleted.
- Student deletion/deactivation: deactivation remains non-destructive, and active-user/active-student SQL predicates prevent access after deactivation. A destructive student-record deletion workflow is not introduced without a separate operational data-retention decision.

## Required release sequence

1. Run `npm test`, `npm run build`, `npm run check`, `npm run test:browser`, `npm run test:production` and `git diff --check`.
2. Commit the exact source and generated client asset.
3. Push and deploy that exact commit to the existing `foxtutor-learn` Worker.
4. Use authenticated production browser sessions and clearly named fixtures to verify admin filters, Open, Download, Details, single delete, bulk delete, student isolation and responsive behavior.
5. Verify each fixture's D1/R2 lifecycle, then remove every fixture.
6. Re-run the public boundary and authenticated regression checks, reconcile documentation and confirm a clean tree.
7. Create a Phase 3 completion tag only if the Phase 3.1, 3.2 and 3.3 gates and mandatory operational requirements are all actually closed.

## Current state

Implementation is local and validated by the repository's automated gates. No production deployment or authenticated acceptance is claimed by this record.
