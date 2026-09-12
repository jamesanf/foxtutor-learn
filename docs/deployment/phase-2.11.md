# Phase 2.11 deployment record

Date: 2026-09-12  
Status: NOT DEPLOYED

## Release scope

Phase 2.11 changes only the calendar composition, FullCalendar sizing configuration, rendered event colour inheritance/content, subscription utility markup/CSS and visual acceptance contracts. D1 schema, feed/token security, ownership, Access policy and public-site assets are unchanged.

## Local release state

The local implementation and real Chrome visual contract pass. The production Worker remains the Phase 2.10 deployment until a release commit is created and deployed.

```text
Worker: foxtutor-learn
Worker version: NOT RUN
Deployment timestamp: NOT RUN
Git commit: NOT RUN
Remote commit verified: NOT RUN
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

Do not create `phase-2.11-complete` until local full-suite/build/check/production smoke, commit/push, Cloudflare deployment, production browser verification, feed/security regression, documentation reconciliation and repository cleanliness are all evidenced.
