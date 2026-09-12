# Phase 1 evidence index

The public baseline files in this directory were captured before any Learn deployment on 2026-09-12. They contain response headers and bodies for the homepage, robots, sitemap and representative asset URLs. The same three public resources were rechecked during Phase 1.2 and retained the same body hashes.

Post-deployment evidence must add:

Phase 1.2 adds capability and local-runtime evidence in `cloudflare-capability-check.txt` and `local-validation.txt`. The following production evidence is intentionally absent because the required control-plane permissions are unavailable:

- Cloudflare Worker production version/route;
- D1 database ID and remote migration result;
- Access application/policy identifiers;
- authenticated browser result summary;
- production noindex header/meta result;
- real controlled mail send output.

`production-inactive.txt` records the live pre-activation result: the public application still serves `/learn` and related paths because no Learn route or Access policy exists yet. A real Chrome headless capture of `/learn` had the public Fox Tutor title and body hash `1b2d8bf63d44b99a9986db537e491a981539426f0294be6ffc1a99e0eff5237b`.

Do not store tokens, cookies, OAuth assertions, private pupil data or authenticated browser profiles.
