# Phase 6 - Testing and acceptance

## Provider-independent coverage

The automated suite covers:

- Phase 5 history to accounting-outbox transaction wiring;
- deterministic idempotency and provider references;
- explicit accounting status transitions and bounded retry timing;
- OAuth URL, state-adjacent adapter, token exchange and refresh seams,
  including the complete callback service chain with the bound Worker fetcher;
- encrypted credential helpers without credential output;
- provider host, scheme, path and response-URL restrictions;
- invoice payload shape, currency/tax configuration and malformed config;
- exact 55.00 GBP bootstrap value, editable fixed-decimal amounts, immutable GBP
  validation and explicit tax payloads;
- unresolved `ADMIN_CANCELLED` classification with no invoice/no-action
  default;
- authentication, authorization, rate-limit, validation, timeout and unknown
  provider outcomes;
- admin-only route classification, billing-settings persistence and
  CSRF-protected accounting actions;
- migration structure through `0020_accounting_company_name.sql`;
- browser shell accessibility and no-index contracts;
- production perimeter smoke.

Current result: **27 test files and 137 tests passed**.

Run the current suite with:

```sh
npm test
npm run build
npm run check
npm run test:browser
npm run test:production
git diff --check
```

The exact current counts are recorded in the latest changelog entry and should
be refreshed whenever tests change.

## Not performed

The following cannot be claimed without human-owned provider access:

- sandbox contact and invoice mapping;
- provider-side sandbox invoice creation;
- provider-side duplicate, timeout and reconciliation evidence;
- production OAuth and company verification;
- one controlled production accounting event;
- independent production provider verification and retention acceptance;
- authenticated production admin/student browser acceptance.

No test fixture substitutes for those external actions.

The deployed OAuth callback emits a stage-labelled diagnostic containing only
a safe error code, HTTP status, fixed stage message and the non-sensitive
fetcher type. Sandbox OAuth completed successfully after the Worker fetcher
binding was corrected; no financial mutation has been performed.

The callback perimeter was verified separately: an invalid-state request to
the exact callback path reaches the Worker and returns its application-level
403, while `/learn/admin` and `/learn/admin/accounting` continue to return
Cloudflare Access authentication redirects.
