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
- the historical unresolved `ADMIN_CANCELLED` classification and its
  no-action safety; Phase 7.17 now makes the approved no-action outcome
  explicit as `NOT_REQUIRED`;
- authentication, authorization, rate-limit, validation, timeout and unknown
  provider outcomes;
- admin-only route classification, billing-settings persistence and
  CSRF-protected accounting actions;
- successful `verifyFreeAgentContactMapping()` persistence through the
  `external_accounting_links` D1 insert, including a `VERIFIED` stored link and
  exact bound-value count;
- provider-independent outbox processing that creates once, replays by
  deterministic provider reference, records bounded retryable failure, marks
  unknown network outcomes and reconciles them without a blind retry;
- migration structure through `0020_accounting_company_name.sql`;
- browser shell accessibility, accounting icon/action contracts and no-index
  contracts;
- production perimeter smoke.

Current result: **27 test files and 143 tests passed**.

The current repository baseline is `52611e2`; the deployed executable source
remains `4afa705` as Worker version
`71accc39-6c06-4fc7-9390-12afcf48add1`. The live D1 verification still shows
one connected Sandbox company, one verified contact mapping for `257175`, no
billing-settings row, no outbox row and no retry-audit row.

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

The following cannot be claimed because the latest acceptance handoff did not
contain executable approved values and provider access alone cannot supply
commercial decisions:

- provider-side Sandbox invoice/category mapping;
- provider-side sandbox invoice creation;
- provider-side duplicate, timeout and reconciliation evidence (the
  provider-independent seams are covered by automated tests);
- production OAuth and company verification;
- one controlled production accounting event;
- independent production provider verification and retention acceptance;
- authenticated production admin/student browser acceptance.

The submitted strings `[INSERT APPROVED CONSEQUENCE]`,
`[INSERT APPROVED POLICY]` and
`[INSERT APPROVED CATEGORY / ITEM / TAX / PAYMENT TERMS / OTHER VALUES]` are
literal placeholders, not test fixtures or approved configuration. No test
has persisted or used them.

No test fixture substitutes for those external actions.

The deployed OAuth callback emits a stage-labelled diagnostic containing only
a safe error code, HTTP status, fixed stage message and the non-sensitive
fetcher type. Sandbox OAuth completed successfully after the Worker fetcher
binding was corrected; no financial mutation has been performed.

The current contact-mapping UI contract also verifies compact MDI save/remove
controls, accessible labels and the absence of a forced desktop table width or
horizontal scrolling.

The callback perimeter was verified separately: an invalid-state request to
the exact callback path reaches the Worker and returns its application-level
403, while `/learn/admin` and `/learn/admin/accounting` continue to return
Cloudflare Access authentication redirects.
