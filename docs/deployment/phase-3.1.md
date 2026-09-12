# Phase 3.1 deployment record

Date: 2026-09-13

## Infrastructure

- Production Worker: `foxtutor-learn`
- Production D1: `foxtutor-learn` (`204dadc5-46ff-41b7-9da1-049f85d29422`)
- Production R2 bucket: `foxtutor-learn-resources`
- Worker binding: `RESOURCES_BUCKET`
- Local R2 bucket: `foxtutor-learn-resources-local`
- Migration: `0004_resources.sql`

The production bucket was created as a dedicated private bucket. Existing `edinterval-images` and `fox-mail-attachments` buckets were not reused or modified.

## Migration and deployment

`0004_resources.sql` was applied remotely with:

```text
npx wrangler d1 migrations apply foxtutor-learn --remote
```

The Worker dry-run confirmed the `RESOURCES_BUCKET` binding and the existing D1/assets bindings. The final resource Worker was deployed successfully as version `dfebaca6-f1e4-4019-bb5a-37f92344c161` at `2026-09-12T23:29:27.398Z` from the Phase 3.1 source. The `foxtutor.org/learn` and `foxtutor.org/learn/*` routes remain attached to `foxtutor-learn`.

Post-deployment verification passed:

```text
npm run test:production
npm run test:browser
npx wrangler d1 migrations list foxtutor-learn --remote
```

Unauthenticated `GET /learn/admin/resources` continues to return the Cloudflare Access redirect. Authenticated resource upload/download/isolation acceptance remains a required human gate.

## Release boundary

This pass does not create or claim `phase-2.12-complete`. The latest verified pre-Phase-3 Worker was `9f2b7ebf-a37a-4711-a7b5-d6c233f72d20`; Phase 2.12 authenticated production, visual and feed-rotation gates remain separately documented as pending.
