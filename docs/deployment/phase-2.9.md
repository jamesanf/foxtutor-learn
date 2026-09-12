# Phase 2.9 deployment and release record

Date: 2026-09-12  
Status: local implementation in progress; deployment and authenticated browser acceptance pending

## Release scope

Phase 2.9 changes only the Learn Worker presentation/client assets and UI contracts:

- `src/worker/index.ts` server-rendered calendar, subscription and create-lesson markup;
- `src/client/learn.ts` visible calendar chevrons and immediate time preview;
- `public/learn.css` composition, spacing, responsive and focus styling;
- `public/learn.js` generated client bundle;
- automated UI contracts and Phase 2.9 documentation.

No migration, D1 schema, feed serializer/token model, Access policy, route, public-site asset, external service or dependency changed.

## Release gates

Before deployment, run:

```text
npm test
npm run build
npm run check
npm run test:browser
npm run test:production
git diff --check
```

Then deploy only the Learn Worker, repeat public smoke and feed/Access regression checks, and obtain fresh authenticated admin/student browser evidence at 1440px, 1440px/75% zoom, 820px and 390px. Do not create `phase-2.9-complete` or a final Phase 2 tag before those gates pass.

## Current deployment state

The Phase 2.8 Worker remains the last known production deployment:

```text
Worker: foxtutor-learn
Version: 999b4239-49f2-4bc3-9dfd-a2bb29d46637
Deployment message: Phase 2.8 calendar and lesson UX refinement
```

The Phase 2.9 changes are not yet deployed in this record. Chromium is unavailable to the current runtime, so authenticated visual acceptance cannot be claimed locally or in production.
