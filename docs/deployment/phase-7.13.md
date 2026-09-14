# Phase 7.13 deployment record

## Deployment requirements

Deploy only the committed Phase 7.13 source. Keep
`FREEAGENT_TEMP_PRODUCTION_REUSE_LEGACY_APP=true` unchanged until Production
OAuth and company verification have been accepted and the permanent
credential policy is deliberately decided.

No new D1 migration is required. The implementation uses the existing
environment-isolated schema through migration `0030_freeagent_dual_connections.sql`.

## Verification

Run:

```text
npm test
npm run build
npm run check:legal
npx wrangler deploy --dry-run --config wrangler.jsonc
npm run test:production
```

Then deploy the exact commit and record the Worker version. Verify the
production D1 migration list before authenticated browser acceptance.

## Acceptance boundary

The supplied authenticated HAR establishes the complete authorization journey
through `/admin/accounting/oauth/callback`. After deployment, capture a new
authenticated HAR and inspect safe Production metadata only:

```text
status
company_name
company_subdomain
environment
last_success_at
last_error_code
last_error_message
updated_at
```

The expected result is `CONNECTED`, a verified Production company identity,
cleared stale error fields, and a fixed configured Production category. No
Production financial mutation is permitted.
