# Phase 6.2 — Security and operational controls

> Historical release record. See [`docs/security/phase-6.md`](phase-6.md) for
> the current Phase 6 security boundary.

- FreeAgent credentials and token material remain server-side only.
- OAuth access and refresh tokens remain encrypted at rest and are not
  rendered, logged, returned to browsers or written to fixtures.
- The configured FreeAgent environment and company subdomain are pinned; a
  mismatched OAuth company or environment is rejected.
- Provider request paths and returned resource URLs are constrained to the
  expected FreeAgent authority and `/v2/` API path.
- Contact mappings require an authenticated admin, CSRF protection, numeric
  input validation and provider verification in the connected company.
- Matching a Learn email address to a FreeAgent contact never creates an
  authorization or mapping relationship.
- Manual retries are admin-only, CSRF-protected, idempotency-key preserving
  and add an immutable audit row without replacing prior failure history.
- Unknown provider outcomes remain visible and reconciliation-only.
- Provider errors are normalized to safe local categories and raw response
  bodies are not persisted.
- Accounting references and retry records survive operational student/lesson
  deletion through nullable foreign keys and additive audit retention.

Production acceptance remains blocked until the business supplies the
commercial mapping and a human configures credentials through the approved
secret-management path.
