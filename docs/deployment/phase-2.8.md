# Phase 2.8 deployment and release record

Date: 2026-09-12  
Status: local implementation complete; deployment and authenticated production acceptance pending

## Release scope

Phase 2.8 changes the bundled `public/learn.js` and `public/learn.css` assets plus server-rendered calendar/subscription/lesson-form presentation. No migration, D1 schema, feed serializer, feed token model, Access policy, route, public-site asset or external service changed.

The latest deployed Worker remains the Phase 2.7 version:

```text
Worker: foxtutor-learn
Version: db13557c3-ffc2-43d2-a4e5-1f12e21eb44d
Deployment message: Phase 2.7 month-first calendar UX
Routes: foxtutor.org/learn and foxtutor.org/learn/*
```

No Phase 2.8 deployment is claimed until local `npm run check`, browser/static checks and the authorized deployment command complete.

## Pre-deployment gates

Run:

```text
npm test
npm run build
npm run check
npm run test:browser
npm run test:production
git diff --check
```

Then inspect the generated bundle, verify no secrets or unintended dependency changes, deploy only the Learn Worker and repeat public smoke, Access-boundary, feed and authenticated browser checks.

## Production acceptance record

Still required: fresh admin/student sessions at 1440px normal, 1440px 75% zoom, 820px and 390px; Month/Week/navigation; Add lesson; 55-minute creation and DST; subscription Copy/regeneration/internal confirmation; student privacy; feed/token regression; Access/public-site regression; exact fixture cleanup; final documentation reconciliation and clean Git state.

Do not create `phase-2.8-complete` or mark Phase 2 complete without those records.

