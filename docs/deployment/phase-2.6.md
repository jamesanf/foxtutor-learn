# Phase 2.6 deployment record

Date: 2026-09-12

## Release

Phase 2.6 deployed the final calendar subscription UX remediation from commit `f75d848`:

- calendar content renders before the subscription utility;
- subscription uses native `<details>/<summary>` and is closed on ordinary GET requests;
- expanded content contains the labeled private link, copy action, regeneration action, restrained warning and concise client instructions;
- responsive CSS keeps the utility compact and usable at desktop, tablet and mobile widths;
- no new dependency or client-side framework was added.

## Worker

The existing `foxtutor-learn` Worker was deployed with:

```text
Worker version: 12109e60-3f5a-4bc2-8b89-8eefc7586249
Deployment message: Phase 2.6 calendar subscription UX remediation
Routes: foxtutor.org/learn and foxtutor.org/learn/*
```

The previous Phase 2.5 Worker version `56ab94cf-a035-4ec2-82b0-c5109299ebfa` remains available as the immediate rollback target.

## D1 and Access

No D1 migration was required or applied. Remote D1 still contains:

```text
0001_foundation.sql
0002_students_lessons.sql
0003_calendar_feeds.sql
```

Cloudflare Access was independently inspected after deployment:

- `foxtutor.org/learn` retains the email allow policy for the provisioned Learn identities;
- `foxtutor.org/learn/calendar/feed/*` retains the separate `Bypass`/Everyone application;
- no other Learn route is exempted.

## Production smoke

Completed after deployment:

- `/learn` → Access redirect;
- `/learn/admin/calendar` → Access redirect;
- `/learn/student/calendar` → Access redirect;
- invalid `/learn/calendar/feed/not-a-real-token` → generic Worker `404`;
- public homepage, robots and sitemap smoke checks pass;
- remote D1 schema and active population checks pass.

No public FoxTutor website files, routes, DNS, assets or Fox Mail files were changed.

## Rollback

If the presentation change causes a production regression, redeploy the previous known-good Worker version or revert the UI commit and deploy. No migration rollback is required because Phase 2.6 made no schema change. Feed URLs, tokens, ownership, Access path scope and the existing database remain unaffected.
