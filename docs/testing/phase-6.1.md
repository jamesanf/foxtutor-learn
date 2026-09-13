# Phase 6.1 — Testing and acceptance

> Historical release record. See [`docs/testing/phase-6.md`](phase-6.md) for
> the current Phase 6 testing boundary.

## Automated baseline

The existing Vitest suite and Worker type/build checks cover the repository
after the accounting boundary changes. Migration tests include the forward-only
Phase 6 schema.

## Required accounting acceptance

The following must be demonstrated with a FreeAgent sandbox fixture before
production activation:

1. A committed Phase 5 event creates exactly one outbox row and a repeated
   mutation cannot create another row.
2. A successful invoice action stores the external ID, resource type and safe
   URL.
3. A timeout becomes `UNKNOWN` and the admin reconciliation path, not blind
   retry, resolves the event.
4. A transient provider failure becomes `RETRYABLE` with bounded backoff.
5. Invalid configuration or missing contact mapping is visible as `FAILED`.
6. Admin retry reuses the same outbox ID and idempotency key.
7. Student/lesson operational deletion leaves the outbox and external mapping
   rows present with nullable local references.
8. OAuth authorization, token refresh and expired-token recovery succeed in
   sandbox.

Production acceptance remains blocked until authenticated admin access, a
verified FreeAgent company identity, commercial mapping and controlled test
fixtures are available.
