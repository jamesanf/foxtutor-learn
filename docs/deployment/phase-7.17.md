# Phase 7.17 deployment record

## Scope

This deployment contains the balanced student dashboard cards, time-of-day
greeting, near-term lesson launch notice, home-learning panel and secured
lesson-scoped student submission route.
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
- the time-of-day greeting and pupil first-name fallback;
- equal card widths across both dashboard rows;
- the red under-30-minute notice with and without a lesson URL;
- the home-learning task and `None available` state;
- the `Submit here` navigation;
- a successful student upload;
- student ownership isolation for another student's lesson submission URL.

No Production invoice, payment, Direct Debit, credit note, bank transaction or
£1 test is part of this feature.

## Deployment provenance

- Git commit: `673c1596494610218fc25d065f0b276eac8241f1`
- Worker: `foxtutor-learn`
- Worker version: `e3086fa8-b0ff-4b65-a0e8-bccdc8187125`
- Routes: `foxtutor.org/learn` and `foxtutor.org/learn/*`
- Deployment completed on 2026-09-15.
