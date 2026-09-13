# Phase 6.1 — FreeAgent accounting boundary

> Historical release record. See [`docs/phase-6.md`](../phase-6.md) for the
> current Phase 6 status and acceptance boundary.

## Status

The local implementation is complete through the durable integration boundary
and remains **not production-accepted**. FreeAgent credentials, payer/contact
mapping and accounting policy values are intentionally not present in the
repository or current Worker configuration.

## Contract

Phase 5 `lesson_history.billing_consequence` is snapshotted into
`accounting_outbox` in the same D1 batch as the history mutation. The stable
business event identity is the immutable history ID and the idempotency key is
`accounting:<event-type>:<history-id>`.

| Phase 5 consequence | Local decision | FreeAgent action |
| --- | --- | --- |
| `NO_CHARGE` | `NOT_REQUIRED` | None |
| `EXCEPTION_WAIVED` | `NOT_REQUIRED` | None |
| `RESCHEDULED` | `NOT_REQUIRED` | None |
| `ADMIN_CANCELLED` | `FAILED` / `BUSINESS_MAPPING_REQUIRED` | Blocked until the commercial mapping is supplied |
| `CANCELLATION_PENDING_DECISION` | No final outbox event | None |

The application does not invent invoice amounts, VAT treatment, payer identity,
nominal/category codes or accounting dates. A configured invoice action is
therefore gated by explicit Worker configuration and an existing mapped
FreeAgent contact.

## Persistence and processing

`accounting_outbox` is separate from the notification outbox. It stores local
event identity, the classification snapshot, state, retry timing, safe error
information and the external reference. `external_accounting_links` stores
only the narrow Learn-student to FreeAgent-contact reference. Accounting
references use `ON DELETE SET NULL`, so operational student/lesson deletion
cannot erase accounting history.

The Worker claims due rows atomically, processes a bounded batch every five
minutes, refreshes encrypted OAuth tokens when needed, reconciles an existing
invoice by deterministic reference before creating one, and records provider
references. Timeouts, network failures and uncertain provider results become
`UNKNOWN` and require reconciliation; they are never blindly recreated.

## FreeAgent contract verified

The implementation follows the official FreeAgent developer documentation
consulted on 2026-09-13:

- OAuth 2.0 approval: `/v2/approve_app`; token exchange/refresh:
  `/v2/token_endpoint`.
- Production base URL: `https://api.freeagent.com`; sandbox base URL:
  `https://api.sandbox.freeagent.com`.
- Contacts use `/v2/contacts`; invoices use `/v2/invoices`.
- Draft invoice creation returns `201 Created` and a canonical resource URL.
- `X-Api-Version` is supported as an explicit date header.
- Rate limits are 120 requests/minute, 3,600/hour and 15 token refreshes/minute;
  `429` handling uses bounded retry and `Retry-After` when supplied.

OAuth ciphertext is stored only in `accounting_connections`, encrypted with
`FREEAGENT_TOKEN_ENCRYPTION_KEY`. Secrets are never rendered or logged.

## Configuration boundary

Required secret/configuration names are:
`FREEAGENT_CLIENT_ID`, `FREEAGENT_CLIENT_SECRET`,
`FREEAGENT_TOKEN_ENCRYPTION_KEY`, `FREEAGENT_OAUTH_REDIRECT_URI`,
`FREEAGENT_ENVIRONMENT` (`sandbox` or `production`), and the explicit invoice
mapping values `FREEAGENT_INVOICE_AMOUNT`,
`FREEAGENT_INVOICE_ITEM_TYPE`, `FREEAGENT_INVOICE_PAYMENT_TERMS_DAYS`,
`FREEAGENT_INVOICE_CATEGORY_URL` and, where required,
`FREEAGENT_INVOICE_CURRENCY`.

No live financial mutation is enabled until the business supplies and verifies
those values against the intended FreeAgent company.
