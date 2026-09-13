# Phase 6 - Security and operations

## Provider credentials

FreeAgent client credentials, OAuth tokens and the token encryption key are
server-side configuration. They are never committed, rendered, logged or
stored in raw form. Provider response bodies are not persisted.

The adapter restricts credential-bearing requests to the configured FreeAgent
origin and `/v2/` paths. Provider-returned contact and invoice URLs must use
the same origin and are rejected otherwise.

## OAuth

Authorization state is random, stored as a hash with the initiating admin,
environment and expiry, and consumed atomically. Callback state, admin
identity, environment and configured redirect URI must all match. Tokens are
encrypted with AES-GCM material derived from the server-side encryption key.

## Identity and authorization

Every accounting route is classified as an admin route before handler
execution. Students and unauthenticated callers cannot reach accounting
monitoring, mapping, retry, reconcile or OAuth operations. State-changing
admin actions require the session CSRF token. Direct URL access is not
authorized by navigation visibility.

## Financial safety

Missing commercial configuration, any amount other than 55.00 GBP, any
currency other than GBP, any VAT/tax value other than explicit zero, invalid
date data, missing or unverified contact mappings, company/environment drift
and unsupported or unresolved action types fail closed. A timeout, network
failure or uncertain provider response becomes `UNKNOWN` and requires
reconciliation.

Duplicate creation is prevented by deterministic local identity, provider
reference lookup and durable external-reference uniqueness. A successful
event cannot be retried or reverted by browser replay.

## Retention and deletion

Operational lesson and student deletion uses `ON DELETE SET NULL` for
accounting references. Authoritative accounting event identity, status,
provider reference and audit history remain. Contact mapping removal is
blocked while active accounting work depends on it.

Logs may include event identity, status, attempt, safe error code and provider
reference. They must not include secrets, authorization headers, raw OAuth
responses or unnecessary personal data.
