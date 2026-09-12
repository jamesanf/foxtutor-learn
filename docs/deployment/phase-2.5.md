# Phase 2.5 production deployment

## Deployed components

The existing `foxtutor-learn` Worker remains the only Learn application deployment. Phase 2.5 deployed Worker version `56ab94cf-a035-4ec2-82b0-c5109299ebfa` with the Phase 2.3 calendar UI and Phase 2.4 private feed implementation. No public-site or Fox Mail repository was changed.

Production D1 database `foxtutor-learn` (`204dadc5-46ff-41b7-9da1-049f85d29422`) was migrated through:

```text
0001_foundation.sql
0002_students_lessons.sql
0003_calendar_feeds.sql
```

The migration creates `calendar_feeds`, a unique `token_hash`, the active-owner partial unique index and the token-hash lookup index. The feed table stores no plaintext bearer token.

## Cloudflare Access configuration

The existing application remains:

```text
foxtutor.org/learn
foxtutor.org/learn/*
```

It keeps the existing Google-backed allow policy for the provisioned admin and student identities.

The production feed exception is a separate, more-specific self-hosted application:

```text
foxtutor.org/learn/calendar/feed/*
```

It has one `Bypass` policy for `Everyone`. Cloudflare path specificity selects this application only for the feed subtree. The Worker still validates the opaque token, hashes it for the D1 lookup, checks active ownership and projects only authorized lessons. No other `/learn/*` path is exempted.

## Verification

Direct production requests verified that:

- an invalid token on the exact feed path reaches the Worker and returns generic `404` with `text/plain`, private/no-store, noindex and security headers;
- `HEAD` follows the same generic denial behavior;
- an unrelated extra path under `/learn/calendar/feed/*` is not treated as a feed and remains behind the normal application boundary;
- `/learn`, `/learn/admin`, `/learn/admin/calendar` and `/learn/student/calendar` still redirect to interactive Access when unauthenticated.

Fresh authenticated admin/student UI, token rotation, live feed changes, real subscribed-calendar refresh and guarded fixture cleanup passed. The controlled event appeared in the user's subscribed calendar after provider refresh; provider-specific refresh intervals remain outside Learn's control.

## Deployment procedure

From the repository root:

```sh
npm test
npm run build
npm run check
npm run test:browser
npm run test:production
npx wrangler d1 migrations apply foxtutor-learn --remote
npx wrangler deploy --message "Phase 2.5 production calendar and private feeds"
```

Never print or commit `CLOUDFLARE_API_TOKEN`, Access session cookies, or generated feed URLs.
