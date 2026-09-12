# Phase 2.11 deployment record

Date: 2026-09-12  
Status: DEPLOYED — authenticated production browser acceptance pending

## Release scope

Phase 2.11 changes only the calendar composition, FullCalendar sizing configuration, rendered event colour inheritance/content, subscription utility markup/CSS and visual acceptance contracts. D1 schema, feed/token security, ownership, Access policy and public-site assets are unchanged.

## Local release state

The local implementation and real Chrome visual contract pass. The Phase 2.11 release is deployed, but authenticated production browser acceptance cannot be run because no production Cloudflare Access/browser credentials are available in this environment.

```text
Worker: foxtutor-learn
Worker version: 8f157d02-a729-4813-b017-2049371dec3c
Deployment timestamp: 2026-09-12T22:50:18.740Z
Git commit: 4b099f8
Remote commit verified: PASS — deployment message `Phase 2.11 definitive calendar UI remediation`; Wrangler deployment list reports the version at 100%
Production smoke: PASS — public site, sitemap, `/learn` Access redirect
Authenticated browser acceptance: NOT RUN — no authenticated production browser session or Cloudflare Access credential is available
Visual acceptance: PASS locally; production NOT RUN
Contrast tests: PASS locally
Month viewport-fit tests: PASS locally
Subscription composition: PASS locally
Calendar feed regression: PASS for unauthenticated boundary — invalid-token GET/HEAD/POST return 404; admin/student feed routes redirect to Access
Remote D1 migrations: PASS — no migrations to apply
```

## Release gate

Do not create `phase-2.11-complete` until authenticated production browser verification (including calendar and subscription flows), feed ownership isolation, documentation reconciliation and repository cleanliness are all evidenced.
