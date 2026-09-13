# Phase 6.1 — Accounting integration security

> Historical release record. See [`docs/security/phase-6.md`](phase-6.md) for
> the current Phase 6 security boundary.

FreeAgent credentials are server-side only. OAuth access and refresh tokens are
encrypted before storage in `accounting_connections`; they are not stored on
students, lessons or billing events, rendered in HTML, returned by routes or
written to logs.

All accounting admin routes use the existing admin role, session and CSRF
controls. OAuth state is random, hashed before persistence, single-use and
expires after ten minutes. Provider URLs are accepted only when they match the
configured FreeAgent sandbox or production origin and `/v2/` path.

Accounting failures store only normalized categories and short sanitized
messages. Raw provider bodies, authorization headers and credentials are not
stored. Unknown external outcomes cannot be retried from the ordinary retry
button; they require explicit invoice-reference reconciliation.

Accounting rows use nullable `ON DELETE SET NULL` links to operational student
and lesson records. Operational deletion therefore cannot erase accounting
history or external references.
