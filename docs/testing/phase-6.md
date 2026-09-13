# Phase 6 - Testing and acceptance

## Provider-independent coverage

The automated suite covers:

- Phase 5 history to accounting-outbox transaction wiring;
- deterministic idempotency and provider references;
- explicit accounting status transitions and bounded retry timing;
- OAuth URL, state-adjacent adapter, token exchange and refresh seams;
- encrypted credential helpers without credential output;
- provider host, scheme, path and response-URL restrictions;
- invoice payload shape, currency/tax configuration and malformed config;
- exact 55.00 GBP minor-unit representation and explicit zero-tax payloads;
- unresolved `ADMIN_CANCELLED` classification with no invoice/no-action
  default;
- authentication, authorization, rate-limit, validation, timeout and unknown
  provider outcomes;
- admin-only route classification and CSRF-protected accounting actions;
- migration structure through `0018_accounting_unresolved_action.sql`;
- browser shell accessibility and no-index contracts;
- production perimeter smoke.

Current result: **26 test files and 125 tests passed**.

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

- sandbox OAuth and company verification;
- sandbox contact and invoice mapping;
- provider-side sandbox invoice creation;
- provider-side duplicate, timeout and reconciliation evidence;
- production OAuth and company verification;
- one controlled production accounting event;
- independent production provider verification and retention acceptance;
- authenticated production admin/student browser acceptance.

No test fixture substitutes for those external actions.
