# Phase 2.10 deployment and release record

Date: 2026-09-12  
Status: deployed; authenticated production acceptance pending

## Release scope

Phase 2.10 changes the Learn Worker source, bundled client, CSS, FullCalendar Standard dependency set, query layer, admin route classification, UI contracts and phase documentation. It does not change D1 schema, feed serialization/token security, Access policy, public-site assets, DNS or Fox Mail.

The dependency addition is the compatible MIT-licensed `@fullcalendar/timegrid@6.1.21`; core and daygrid remain pinned at `6.1.21`. No Premium or hosted calendar assets are used.

## Production baseline

The last verified production deployment is:

```text
Worker: foxtutor-learn
Version: a844a418-b858-4a8c-a348-25a91df964d2
Deployment message: Phase 2.9 UI composition and lesson-time workflow
Deployment timestamp: 2026-09-12T21:04:41Z
```

`npx wrangler deployments list --config wrangler.jsonc` verified this version as the current 100% deployment before the Phase 2.10 release.

## Phase 2.10 deployment

```text
Release commit: 68ba651
Remote branch: origin/main
Worker: foxtutor-learn
Version: 56471854-7ff2-47bd-b9a0-70f488f0d029
Deployment timestamp: 2026-09-12T21:58:00.509Z
Deployment message: Phase 2.10 final tutoring workflow UX
Routes: foxtutor.org/learn and foxtutor.org/learn/*
Assets uploaded: /learn.css, /learn.js
```

Cloudflare reported 100% traffic on the new version. Production route checks return the expected Cloudflare Access redirects for `/learn`, `/learn/admin/calendar`, `/learn/admin/bookings`, `/learn/admin/students` and `/learn/admin/lessons`. The narrow invalid-token feed route returns generic 404 for GET, HEAD and POST. Remote D1 reports no migrations to apply; Phase 2.10 requires no schema change.

## Local release-gate status

The local implementation has passed the automated and rendered-browser review gates. The local authenticated review covered the calendar at 1440px, approximately 75% desktop zoom, 820px and 390px, plus Dashboard, Bookings, Create Lesson and the one-email Student form. The mobile TimeGrid uses an internal horizontal scroll surface without page-level overflow.

Before deployment:

```text
npm test
npm run build
npm run check
npm run test:browser
npm run test:production
git diff --check
```

All listed local commands pass, and the release is deployed. `npm run test:production`, the live Access route checks, invalid-token feed checks and remote migration verification pass. Authenticated production browser acceptance was not run because no authenticated production browser session or Access credential is available in this environment; production UI behavior, ownership workflows and controlled fixture cleanup therefore remain unclaimed.

No `phase-2.10-complete` tag or Phase 2 final sign-off is claimed in this record.
