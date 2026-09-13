# Phase 6 - Accounting architecture

## Boundary

```text
operational lesson history
  -> accounting classification
  -> accounting outbox
  -> scheduled Worker claim
  -> FreeAgent adapter
  -> external reference and safe delivery state
```

Operational routes never call FreeAgent directly. The worker owns external
side effects, and the provider adapter owns FreeAgent URLs, headers, payloads,
responses and error normalization.

## Contract

`NO_CHARGE`, `EXCEPTION_WAIVED` and `RESCHEDULED` are durable
`NOT_REQUIRED` accounting outcomes. `CANCELLATION_PENDING_DECISION` does not
create a final accounting event. `ADMIN_CANCELLED` creates an explicit
invoice-producing outbox record in a fail-closed state until the approved
commercial contract is configured.

The event stores the immutable Phase 5 history identity and effective date.
The event never silently changes classification after creation. Any future
commercial correction must be represented as an explicit compensating event,
not an overwrite.

## Persistence

`accounting_outbox` stores the event type, business identity, classification
snapshot, action, status, retry state, safe error, provider reference and
effective date. Database uniqueness enforces one event per
`(event_type, business_event_id)`, one idempotency key and one external
reference.

`external_accounting_links` stores only the Learn-to-FreeAgent contact
reference and verified provider identity. Existing mappings cannot be replaced
while dependent accounting work is pending, processing, retryable or unknown.
Removal is blocked under the same conditions.

`accounting_retry_audit` is additive and records the actor, prior status,
request result, resulting status, provider reference and safe outcome. It does
not store credentials or raw provider responses.

## Status model

| From | Allowed next state |
| --- | --- |
| `PENDING` | `PROCESSING` |
| `PROCESSING` | `SUCCEEDED`, `RETRYABLE`, `FAILED`, `UNKNOWN` |
| `RETRYABLE` | `PROCESSING` |
| `FAILED` | `RETRYABLE` via explicit admin retry |
| `UNKNOWN` | `SUCCEEDED` via reconciliation |
| `SUCCEEDED` | none |
| `NOT_REQUIRED` | none |

Claims are atomic database updates. A stale `PROCESSING` claim becomes
`UNKNOWN`; it is never silently restarted as a fresh creation.

## Provider safety

The adapter uses one allowlisted FreeAgent origin for each environment,
rejects external request origins and unsafe provider response URLs, validates
contact and invoice references, redacts authorization headers and stores
encrypted OAuth material only in D1.

Invoice configuration requires an explicit positive amount, item type,
category URL, payment terms, supported ISO currency and either an explicit
sales-tax rate or `EXEMPT`. Missing or malformed values fail before a provider
request.

## Non-scope

Learn does not implement direct debit, card charging, payment collection,
payment methods, balances, bank details or a second accounting ledger.
