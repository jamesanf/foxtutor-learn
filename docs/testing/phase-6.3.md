# Phase 6.3 - Testing and acceptance preflight

## Automated baseline

The pre-change baseline on 2026-09-13 was:

```text
npm test              26 test files, 123 tests passed
npm run build         passed
npm run check         passed
npm run test:browser  passed
npm run test:production passed
git diff --check      passed
```

The production perimeter smoke returned HTTP 200 for the public homepage,
robots and sitemap, and HTTP 302 for `/learn`. The browser command is the
repository's static shell contract; no authenticated production Chromium
acceptance was claimed.

## Current implementation evidence

Local tests cover the Phase 5 to accounting outbox transaction, deterministic
business-event identity, FreeAgent URL/origin restrictions, normalized
provider errors, OAuth exchange/refresh seams, timeout-to-unknown behavior,
admin authorization classification and migration `0017`.

The production D1 schema contains:

- `accounting_outbox`;
- `accounting_connections`;
- `external_accounting_links`;
- `accounting_retry_audit`.

All four tables currently contain zero rows. This is expected because no
commercial contract, provider credentials, OAuth connection or mapping has
been supplied.

## Acceptance not performed

The following remain unproven and must not be inferred from local tests:

- commercial approval for every accounting-producing classification;
- sandbox credentials and encryption key;
- sandbox OAuth authorization and refresh;
- sandbox company identity;
- approved payer/contact mapping;
- approved invoice item/category and tax mapping;
- sandbox provider-side invoice creation;
- duplicate, retryable, permanent and unknown-result acceptance;
- reconciliation and manual-retry audit acceptance against a configured
  provider;
- production credentials and company verification;
- one controlled production accounting event;
- independent production provider-side verification;
- production retention and authenticated admin/student acceptance.

No external acceptance report or `phase-6-complete` tag is claimed.
