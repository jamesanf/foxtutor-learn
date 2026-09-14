# Phase 7.11 - FreeAgent provider contract and environment routing repair

## Status

Phase 7.11 is implemented, tested and deployed, but the overall release is
**NOT READY - PRODUCTION FREEAGENT AUTHORIZATION REQUIRED**. Production
credentials and a human authorization are still required before the
read-only Production company, James contact, mandate and category acceptance
can be completed.

This phase does not redesign billing, add direct GoCardless authority, create
an invoice, create a payment, collect Direct Debit, or run the £1 test.

## Root cause: category failure

The category warning was an incorrect provider-response contract, not a
payment or authorization failure. The client expected one `categories` array
with `name`, while the documented FreeAgent endpoint returns four collections:

```json
{
  "admin_expenses_categories": [],
  "cost_of_sales_categories": [],
  "income_categories": [],
  "general_categories": []
}
```

Category labels use `description`; `nominal_code` and `url` are also supplied.
The repaired adapter maps the four collections once into the application
model, retains the category group, removes duplicate provider URLs, sorts
deterministically and rejects malformed items or URLs from the wrong
environment. The admin UI now displays descriptions and nominal codes and
supports search by description, code or group.

No live Sandbox category payload was captured during this pass because no
authenticated provider/admin session was available. The parser and UI
acceptance use the documented response contract and controlled provider
fixtures; live category evidence remains explicitly outstanding.

## Root cause: OAuth environment routing

The deployed admin reauthentication action was observed launching the Sandbox
FreeAgent approval host because the action was still operating against the
Sandbox configuration. The repair keeps one authoritative server-side
`FREEAGENT_ENVIRONMENT` value and routes the actual admin action through the
environment-aware configuration:

| Environment | API origin | Authorization | Token endpoint |
| --- | --- | --- | --- |
| Sandbox | `https://api.sandbox.freeagent.com` | `/v2/approve_app` | `/v2/token_endpoint` |
| Production | `https://api.freeagent.com` | `/v2/approve_app` | `/v2/token_endpoint` |

The action wording is `Connect FreeAgent` when the selected environment is
not connected and `Reauthenticate FreeAgent` when it is connected. The
generated URL contains the environment's client ID, exact registered callback,
`response_type=code` and a fresh state. The full URL and state are not logged.

OAuth state is persisted with provider, environment, administrator, expiry
and one-time consumption. The callback rejects missing, expired, consumed,
wrong-provider and wrong-environment state before token exchange and never
overwrites the other environment's connection.

Production uses only the Production credential names. Legacy generic
credentials remain a Sandbox compatibility path and cannot be used for
Production.

## Company and category safety

An environment is not marked connected merely because token exchange
succeeds. Company lookup must match the configured company subdomain and
expected currency before the connection is persisted as connected. Category
URLs must match the active API origin and live options are loaded for the
connected environment/company; arbitrary URLs are not accepted.

The accounting boundary remains:

```text
FreeAgent -> GoCardless -> Direct Debit
```

FoxTutor does not create a parallel GoCardless mandate or collect bank
details.

## Test and validation evidence

- Complete suite: **38 test files, 229 tests passed**.
- `npm run build`: passed.
- `npm run check:legal`: passed.
- `npx wrangler deploy --dry-run --config wrangler.jsonc`: passed.
- `npm run test:production`: passed; `/learn` returned the expected Access
  `302`.
- Remote D1 migration check: `No migrations to apply!`.
- Added coverage for the documented category collections, normalization,
  deduplication, malformed responses, wrong-origin URLs, provider errors,
  OAuth host/token selection, state environment binding, company verification
  and the actual admin URL-generation route.

## Deployment provenance

The functional Phase 7.11 source was committed and deployed as:

| Item | Value |
| --- | --- |
| Source commit | `6067e837c3e4b9ada48cbe19ad71fb0d70e6e159` |
| Worker version | `8cd9b99f-de03-466a-8a37-46ad3e78696b` |
| D1 migrations | `0001` through `0029_accounting_category_environment.sql` |
| Public smoke | `/learn` returned Cloudflare Access `302` |
| Financial activity | No Production financial mutation performed |

The documentation reconciliation was committed as
`1c14e7c1ab5f44ef77af5afebdc6580a03c20f3a` and deployed as Worker version
`b8782a16-fbac-4a53-a0ea-4f4c04fccb96`. It is documentation-only and does not
alter Worker code, D1 schema or provider state.

## Human handover and next gate

The remaining external actions are:

1. Supply the Production FreeAgent OAuth client credentials using the
   repository's Production secret names.
2. Click the FoxTutor-generated Production `Connect FreeAgent` action.
3. Authorize the expected FreeAgent company.

After that, perform read-only company verification, James contact discovery
and verification, mandate-state read, and Production category lookup. Do not
create an invoice or payment until a later phase explicitly authorizes it.
