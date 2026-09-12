# Phase 1 evidence index

The public baseline files in this directory were captured before any Learn deployment on 2026-09-12. They contain response headers and bodies for the homepage, robots, sitemap and representative asset URLs. The same three public resources were rechecked during Phase 1.2 and Phase 1.3 and retained the same body hashes.

Phase 1.3 capability reconciliation established that the runtime has two existing Cloudflare mechanisms:

- `CLOUDFLARE_API_TOKEN`: active account/zone/Worker/Access-read path, but insufficient for D1, Worker deployment, Routes and R2.
- Existing Wrangler OAuth session: account/zone/Worker/D1/Routes/R2-read path with relevant Worker, D1 and Routes write scopes; Access writes remain forbidden.

The OAuth-backed inventory is four Workers without `foxtutor-learn`, two unrelated D1 databases without `foxtutor-learn`, zero Workers Routes, two R2 buckets, and empty Access application, identity-provider and policy collections. No production mutation was made. The exact matrix, endpoints and sanitized responses are in `cloudflare-capability-check.txt`.

Post-deployment evidence must add:

Phase 1.2 and Phase 1.3 add capability and local-runtime evidence in `cloudflare-capability-check.txt` and `local-validation.txt`. The following production evidence is intentionally absent because the required Access write control-plane permission is unavailable:

- Cloudflare Worker production version/route;
- D1 database ID and remote migration result;
- Access application/policy identifiers;
- authenticated browser result summary;
- production noindex header/meta result;
- real controlled mail send output.

`production-inactive.txt` records the live pre-activation result: the public application still serves `/learn` and related paths because no Learn route or Access policy exists yet. A real Chrome headless capture of `/learn` had the public Fox Tutor title and body hash `1b2d8bf63d44b99a9986db537e491a981539426f0294be6ffc1a99e0eff5237b`.

Do not store tokens, cookies, OAuth assertions, private pupil data or authenticated browser profiles.

Phase 1.4 credential verification:

- `phase-1.4-credential-check.txt` records the safe pre-mutation probes from
  2026-09-12. The exposed API token authenticated to the intended account and
  zone but still failed the required Access application and identity-provider
  write boundary, so production activation was correctly stopped.

The Phase 1.4 runtime recheck on 2026-09-12 confirmed that the intended
Access-write-capable credential is still not exposed to the Learn terminal.
The exact capability results and the unmodified public-site/pre-activation
state are recorded in `phase-1.4-credential-check.txt`. No production
mutation was attempted after the failure.
