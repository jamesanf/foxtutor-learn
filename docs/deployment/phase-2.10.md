# Phase 2.10 deployment and release record

Date: 2026-09-12  
Status: local implementation in progress; not deployed

## Release scope

Phase 2.10 changes the Learn Worker source, bundled client, CSS, FullCalendar Standard dependency set, query layer, admin route classification, UI contracts and phase documentation. It does not change D1 schema, feed serialization/token security, Access policy, public-site assets, DNS or Fox Mail.

The dependency addition is the compatible MIT-licensed `@fullcalendar/timegrid@6.1.21`; core and daygrid remain pinned at `6.1.21`. No Premium or hosted calendar assets are used.

## Current production

The last verified production deployment is:

```text
Worker: foxtutor-learn
Version: a844a418-b858-4a8c-a348-25a91df964d2
Deployment message: Phase 2.9 UI composition and lesson-time workflow
Deployment timestamp: 2026-09-12T21:04:41Z
```

`npx wrangler deployments list --config wrangler.jsonc` verified this version as the current 100% deployment before the Phase 2.10 source changes. The new local source has not been deployed because the required authenticated browser review is unavailable.

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

All listed local commands now pass. Still required before deployment are fresh authenticated production admin/student browser evidence at 1440px, 75% zoom, 820px and 390px; the Bookings pagination matrix; feed/Access/privacy and ownership regression; controlled fixture cleanup; and a production parity check. Deploy only the accepted build, then repeat public smoke, feed regression and authenticated production checks and record the resulting Worker version here and in `README.md`.

No production deployment, `phase-2.10-complete` tag or Phase 2 final sign-off is claimed in this record.
