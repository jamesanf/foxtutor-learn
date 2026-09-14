# Phase 7.12 testing and evidence

## Automated validation

The Phase 7.12 source currently passes:

```text
npm test
npm run build
```

The tests cover the explicit Sandbox/Production OAuth host and client matrix,
environment-specific credential selection, normalized category contracts,
company and category origin validation, environment-bound OAuth state schema,
and the actual admin connection route contract.

## Evidence boundary

No authenticated production admin session or Production FreeAgent credentials
were available in this implementation pass. Therefore this release does not
claim:

- deployed browser redirect evidence;
- live Sandbox category or contact evidence;
- Production OAuth authorization;
- Production company, contact, mandate or category evidence.

No invoice, payment, Direct Debit collection, credit note or other financial
mutation was performed.
