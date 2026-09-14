# Phase 7.17 deployment record

## Scope

This deployment contains the student dashboard lesson summaries, the
home-learning panel and the secured lesson-scoped student submission route.
The submission flow reuses the existing private resource/R2 pipeline and
does not change billing or provider behavior.

## Required validation

```text
npm test
npm run build
npm run check:legal
npx wrangler deploy --dry-run --config wrangler.jsonc
```

The final deployed revision and Worker version are recorded below after the
production deployment completes.

## Acceptance boundary

Authenticated Chromium should verify:

- the next and last lesson cards;
- the home-learning task and `None available` state;
- the `Submit here` navigation;
- a successful student upload;
- student ownership isolation for another student's lesson submission URL.

No Production invoice, payment, Direct Debit, credit note, bank transaction or
£1 test is part of this feature.

## Deployment provenance

- Git commit: `bde4a183fb786e5c0af51a4ff9fee96f25c21600`
- Worker: `foxtutor-learn`
- Worker version: `b972ac5b-46d2-4a30-ba57-a8ab8ae7daa7`
- Routes: `foxtutor.org/learn` and `foxtutor.org/learn/*`
- Deployment completed on 2026-09-15.
