# Phase 7.12 - FreeAgent dual Sandbox/Production connections

## Status

Phase 7.12 is implemented, tested, migrated and deployed. It remains
**NOT READY - PRODUCTION FREEAGENT AUTHORIZATION REQUIRED** until legitimate
Production credentials and human authorization are available.

## Temporary OAuth compatibility test

For the read-only Production OAuth compatibility experiment, the explicit
`FREEAGENT_TEMP_PRODUCTION_REUSE_LEGACY_APP=true` deployment flag temporarily
uses the existing legacy app credentials, token-encryption key and redirect URI
for Production OAuth. The Production company subdomain is intentionally not
borrowed from Sandbox; it is discovered and verified from the read-only
Production `/v2/company` response after authorization. This does not change
the Sandbox connection or the dual-connection persistence. The flag must be
removed or disabled after the experiment is classified.

## Delivered

- Explicit Sandbox and Production connection cards and actions.
- Independent provider connection persistence and category mappings.
- Environment-bound OAuth state, authorization, token exchange and refresh.
- Separate environment-specific credentials and token encryption keys.
- Read-only company verification before `CONNECTED`.
- Exact provider-origin and company-bound category validation.
- Migration `0030_freeagent_dual_connections.sql`.

## Deployment

| Item | Value |
| --- | --- |
| Source commit | `7ef5c76` |
| Worker version | `46e84b42-6201-4141-ad7e-f567ddd45b80` |
| D1 migrations | `0001` through `0030_freeagent_dual_connections.sql` |
| Automated validation | 38 test files, 232 tests |
| Production smoke | `/learn` returned the Cloudflare Access `302` |

## Remaining human acceptance

Authenticated browser verification must confirm that Sandbox actions first
target `https://api.sandbox.freeagent.com/v2/approve_app` and Production
actions first target `https://api.freeagent.com/v2/approve_app`. After
Production credentials are configured, perform only read-only company,
contact/mandate and category verification. Do not create invoices, payments,
Direct Debits or credit notes.
