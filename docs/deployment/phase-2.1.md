# Phase 2.1 deployment

Phase 2.1 uses the existing `foxtutor-learn` Worker, exact `/learn` routes, Access application, production D1 database and deployment command. It does not create a second Worker, database, Access application, mail path or public-site route.

## Safe sequence

1. Run `npm test`, `npm run build`, `npm run check`, `npm run test:browser` and `npm run test:production`.
2. Apply `migrations/0002_students_lessons.sql` to an isolated local D1 and inspect the resulting schema.
3. Review `git diff --check` and the complete source/migration diff.
4. Apply the forward-only migration to the existing `foxtutor-learn` D1 only after confirming the migration has not already been applied.
5. Deploy with the repository's existing `npm run deploy` command.
6. Verify `/learn`, `/learn/admin` and `/learn/student` through the existing Access boundary.
7. Run the controlled admin/student smoke matrix without using permanent arbitrary production test data. Remove any controlled fixture through the supported admin flow.

No Phase 2.1 operation changes Fox Mail, public-site code, public DNS, the public sitemap, Access identity providers or unrelated Cloudflare resources. No automated notifications are sent by student or lesson mutations.

## Production acceptance

The migration is applied to the existing production D1 and final Worker version `3a81dca9-539e-4e42-8c6a-1bc058902fe2` is deployed. The production gate is not complete until the existing admin and student identities prove create/read/update/deactivate, lifecycle, notes, URL and cross-student isolation behavior through direct HTTP/browser requests. The current unauthenticated smoke confirms the Access boundary and public-site regression; controlled authenticated browser credentials are still required for the complete matrix.
