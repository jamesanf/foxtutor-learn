# Phase 1 testing

## Local suite

- `npm test`: 6 test files, 10 tests covering route classification, role isolation, identity normalization, security headers/cookies, D1 migration contract and mail adapter mock/server boundary.
- `npm run build`: TypeScript check.
- `npm run check`: TypeScript check plus Wrangler asset/deployment dry-run.
- `npm run test:browser`: static shell contract for keyboard focus, reduced motion and noindex metadata.

## Required production suite after handover

Use Chromium with separate clean profiles for admin, student and unknown identities. Test direct navigation to `/learn`, `/learn/admin` and `/learn/student`, role isolation, logout, responsive layout, noindex headers/meta and Googlebot-like denial. Capture no credentials or browser profiles.

Run public regression requests for `/`, `/robots.txt`, `/sitemap.xml`, one public asset and one content route. Expected status/content-type and body hashes must be compared with `docs/evidence/phase-1/public-site-baseline.*`.
