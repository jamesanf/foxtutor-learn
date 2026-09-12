# Phase 2.8 deployment and release record

Date: 2026-09-12  
Status: deployed; authenticated production acceptance pending

## Release scope

Phase 2.8 changes the bundled `public/learn.js` and `public/learn.css` assets plus server-rendered calendar/subscription/lesson-form presentation. No migration, D1 schema, feed serializer, feed token model, Access policy, route, public-site asset or external service changed.

The latest deployed Worker remains the Phase 2.7 version:

```text
Worker: foxtutor-learn
Version: db13557c3-ffc2-43d2-a4e5-1f12e21eb44d
Deployment message: Phase 2.7 month-first calendar UX
Routes: foxtutor.org/learn and foxtutor.org/learn/*
```

## Deployment evidence

```text
Worker: foxtutor-learn
Version: 999b4239-49f2-4bc3-9dfd-a2bb29d46637
Deployment timestamp: 2026-09-12T20:23:42Z
Deployment message: Phase 2.8 calendar and lesson UX refinement
Routes: foxtutor.org/learn and foxtutor.org/learn/*
Assets uploaded: /learn.css, /learn.js
```

The deploy output noted that the configured token lacks `All Zones` permission; Wrangler used the zone-based endpoint for the intended `foxtutor.org` routes. No D1 migration, feed code, Access policy or public-site asset was changed.

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

## Production smoke record

`npm run test:production` passed after deployment at 2026-09-12. The public homepage, robots and sitemap returned expected responses, the sitemap excluded Learn, and `/learn` continued to return the existing Access redirect (`302`).

## Authenticated production acceptance record

Still required: fresh admin/student sessions at 1440px normal, 1440px 75% zoom, 820px and 390px; Month/Week/navigation; Add lesson; 55-minute creation and DST; subscription Copy/regeneration/internal confirmation; student privacy; feed/token regression; Access/public-site regression; exact fixture cleanup; final documentation reconciliation and clean Git state.

Do not create `phase-2.8-complete` or mark Phase 2 complete without those records.
