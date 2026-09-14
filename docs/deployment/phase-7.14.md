# Phase 7.14 deployment record

## Source

Implementation and documentation commit:
`b7cb157edb71e8722a41d2ba302b8f4848ad1142`.

Worker version: `607499e6-ddde-4a10-af50-a534c1d16fc8`.

The deployment completed successfully on the `foxtutor.org/learn` routes.

The deployment must contain only the committed Phase 7.14 source and
documentation. The temporary Production credential compatibility flag remains
enabled until authenticated acceptance proves it can be removed safely.

## Required validation

```text
npm test
npm run build
npm run check:legal
npx wrangler deploy --dry-run --config wrangler.jsonc
npm run test:production
```

## Acceptance boundary

Remote D1 inspection is read-only evidence. It does not replace an
authenticated Production FreeAgent contact call or authenticated browser
acceptance of recurring-series create, pause and resume.

No Production invoice, payment, Direct Debit, credit note, bank transaction or
£1 test is permitted in this phase.
