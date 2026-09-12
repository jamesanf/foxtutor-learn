# Phase 1 testing

## Local suite

- `npm test`: unit, integration and security tests covering route classification, role isolation, identity normalization, security headers/cookies, D1 migration contract, route scope and the Fox Mail adapter boundary.
- `npm run build`: TypeScript check.
- `npm run check`: TypeScript check plus Wrangler asset/deployment dry-run.
- `npm run test:browser`: static shell contract for keyboard focus, reduced motion and noindex metadata.
- `npx wrangler d1 migrations apply foxtutor-learn-local --local --persist-to /tmp/foxtutor-learn-d1-clean --config wrangler.local.jsonc`: clean local D1 migration execution.
- `npx wrangler d1 execute foxtutor-learn-local --local --persist-to /tmp/foxtutor-learn-d1-clean --config wrangler.local.jsonc --command "SELECT ..."`: schema inspection against the migrated database.
- `npx wrangler dev --config wrangler.local.jsonc --persist-to /tmp/foxtutor-learn-local-runtime --port 8787`: local Worker/D1 smoke flow with controlled `X-Learn-Test-Identity` headers.

The local Worker smoke flow demonstrated 401 for unauthenticated requests, 303 role entry, 200 for an active student shell, 403 for a student requesting an admin route, noindex/security headers, and `/learn/assets/learn.css` serving only inside the Learn path.

## Required production suite

Production remains pending the external Cloudflare permissions and Access/mail configuration in `docs/handover/phase-1.md`. Once available, use Chromium with separate clean profiles for admin, student and unknown identities. Test direct navigation to `/learn`, `/learn/admin` and `/learn/student`, role isolation, logout, responsive layout, noindex headers/meta and Googlebot-like denial.

Run public regression requests for `/`, `/robots.txt`, `/sitemap.xml`, one public asset and one content route. Compare status, content type, key headers and body hashes with `docs/evidence/phase-1/public-site-baseline.txt` and the captured bodies.
