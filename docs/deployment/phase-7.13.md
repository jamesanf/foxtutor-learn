# Phase 7.13 deployment record

> **Historical deployment record.** Phase 7.14 is the current deployment
> and acceptance boundary.

## Deployed revision

| Item | Value |
| --- | --- |
| Commit | `6db5a1c581e3c326c7d8927eee8568c66292bebf` |
| Worker version | `50eda89c-8729-446c-902b-eb9e10ec3015` |
| Routes | `foxtutor.org/learn`, `foxtutor.org/learn/*` |
| Scheduler | `*/5 * * * *` |
| D1 | `foxtutor-learn` |
| Migrations | No migrations pending; schema through `0030` |
| Git status | Clean after deployment |

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

The exact commit was deployed and the Worker version recorded above. The
production D1 migration list reported no migrations to apply.

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
