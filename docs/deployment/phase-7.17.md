# Phase 7.17 deployment record

## Scope

This deployment contains the balanced student dashboard cards, time-of-day
greeting, near-term lesson launch notice, home-learning panel, secured
lesson-scoped student submission route, logout-session repair and compact
Learn header branding.
The submission flow reuses the existing private resource/R2 pipeline and
the logout repair does not change billing or provider behavior.

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
- the logout POST, signed-out landing page and explicit resume link.
- the reduced centered Learn mark and contracted header bar at desktop and
  mobile widths.

No Production invoice, payment, Direct Debit, credit note, bank transaction or
£1 test is part of this feature.

## Deployment provenance

- Git commit: `ef3c325`
- Worker: `foxtutor-learn`
- Worker version: `fd45ff20-c8b3-4ce3-be88-783eed460667`
- Routes: `foxtutor.org/learn` and `foxtutor.org/learn/*`
- Deployment completed on 2026-09-15. The unauthenticated endpoint smoke test
  correctly reached the Cloudflare Access login boundary. Authenticated
  Chromium logout acceptance remains a human-session check.
