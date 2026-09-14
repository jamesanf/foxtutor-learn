# Phase 7.11 testing and evidence

## Automated results

The final complete suite passed:

- 38 test files;
- 229 tests;
- no reported failures.

Additional validation passed:

```text
npm run build
npm run check:legal
npx wrangler deploy --dry-run --config wrangler.jsonc
npm run test:production
```

The production smoke route `/learn` returned the expected Cloudflare Access
`302`. Remote D1 reported `No migrations to apply!`.

## Regression coverage

The Phase 7.11 tests cover:

- the documented four-collection FreeAgent category response;
- one category in each collection;
- missing collections and empty collections;
- null collections and malformed items;
- missing URL or description;
- duplicate provider URLs;
- deterministic group/description/code ordering;
- wrong-environment category URLs;
- provider 401, 403, 429 and 500 responses;
- malformed JSON;
- Sandbox and Production API, authorization and token hosts;
- Production-only credential selection;
- OAuth state environment binding and callback mismatch rejection;
- company subdomain/currency verification;
- the actual admin route URL generator rather than only a helper.

## Evidence boundary

No authenticated provider/admin session was available for this pass. Therefore
the following are not claimed:

- live Sandbox `/v2/categories` HTTP status, top-level keys or count;
- Production OAuth authorization;
- Production company verification;
- Production James contact or mandate-state read;
- live Production category options;
- any invoice, payment or Direct Debit collection.

The documented provider response shape is covered by controlled tests, but it
is not a substitute for the outstanding live Sandbox evidence.
