# Phase 7.13 - Production OAuth callback completion

## Status

The post-authorization Production OAuth pipeline is implemented and
automatically validated. Live authenticated browser acceptance remains
required before declaring Production connected.

## Delivered

- Preserved the temporary
  `FREEAGENT_TEMP_PRODUCTION_REUSE_LEGACY_APP=true` compatibility path.
- Added safe diagnostics for OAuth state creation, retrieval, validation,
  consumption, token exchange, company read, token persistence and connection
  persistence.
- Classified callback failures by stage and returned an environment-specific
  administrator error instead of silently presenting a successful redirect.
- Marked an existing environment connection `ATTENTION` when callback
  processing fails.
- Persisted the verified company identity, `last_success_at`, and cleared
  stale connection errors on successful upsert.
- Fixed temporary Production status evaluation so a discovered, verified
  Production company can become `CONNECTED` without borrowing a Sandbox
  subdomain.
- Resolved the FoxTutor accounting category from the approved Sandbox policy
  reference using provider category attributes. Ambiguous and missing
  matches remain explicit configuration exceptions.
- Replaced the normal unrestricted category dropdown with a fixed configured
  mapping; exceptional selection remains available only when unresolved.
- Added regression coverage for callback-stage failures, category matching,
  ambiguity, no-match handling and the fixed category UI.

## Safety boundary

Production and Sandbox connections, tokens, company identities and category
mappings remain environment-specific. Provider category URLs are never copied
between environments. No Production invoice, payment, Direct Debit, credit
note or £1 test was created.

## Known evidence boundary

The supplied HAR proves that Production approval, FreeAgent login, app
approval, authorization-code return and the FoxTutor callback are reached. The
source-level failure was the status check rejecting the discovered Production
subdomain because no Production subdomain pin exists under the temporary
compatibility path. A new authenticated HAR and safe live connection metadata
must still be captured after deployment.
