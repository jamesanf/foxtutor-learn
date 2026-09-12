# Phase 1 architecture

The Learn application is a single Cloudflare Worker with Static Assets. The Worker is intended to own only the exact `foxtutor.org/learn` route and `foxtutor.org/learn/*`; all other paths remain with the public Foxtutor deployment. Learn assets are addressed below `/learn/assets/` so the Worker does not need global `/learn.css` or `/learn.js` interception.

## Request flow

1. Cloudflare Access authenticates Google identity before the Learn route.
2. Access supplies the authenticated email header to the Worker.
3. The Worker normalizes the email and looks up an `ACTIVE` D1 user.
4. Unknown, disabled or malformed identities receive a generic denial.
5. The Worker creates or validates an opaque server-side session in D1.
6. Route classification enforces `ADMIN` or `STUDENT` before rendering the shell.
7. Private responses carry no-store, noindex and browser security headers.

The Fox Mail boundary is the machine API `POST /internal/api/v1/messages/send`. Learn supplies a configured authorized `from` identity, recipient array, plain-text body, bearer token and idempotency key. Optional Cloudflare Access service-auth headers are supported when the mail hostname is configured for non-interactive machine access.

The Access header is trusted only on the production route protected by the Access application. The Worker is configured with `workers_dev=false` and `preview_urls=false` to avoid creating an alternate public entry point.

## Current shell

The Phase 1 shell deliberately contains no pupil data or lesson implementation. Admin and student navigation are separate, with skeleton empty states for Phase 2. `/learn` redirects to the role area after authorization; direct role URLs are tested by the route classifier and will be tested in production after Access is enabled.

## Data

`users` is the first D1 domain table. `sessions` stores only hashes, user linkage, timestamps and a CSRF hash. No password, OAuth token or Access token is stored. Migrations are forward-only under `migrations/`.
