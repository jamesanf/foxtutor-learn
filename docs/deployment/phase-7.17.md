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

- Git commit: `d8c830f724162841413ad9418527f64819c7031c`
- Worker: `foxtutor-learn`
- Worker version: `862fc392-fe23-4e65-b659-6e34b2107b76`
- Routes: `foxtutor.org/learn` and `foxtutor.org/learn/*`
- Deployment completed on 2026-09-15.
