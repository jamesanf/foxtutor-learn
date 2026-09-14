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
`UNRESOLVED` outbox record in a fail-closed state; it does not choose invoice
creation or no action.

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

`accounting_billing_settings` is a single-row, admin-managed configuration
record. It stores the amount, FreeAgent item type and category, payment terms
and explicit sales-tax rate used for future invoice attempts, together with
the last admin actor and timestamps. Existing outbox rows retain their
classification and are not rewritten when settings change. GBP is enforced
both by the application validator and the database constraint. If the record
does not yet exist, a valid environment configuration is imported once as the
bootstrap value; invalid or incomplete configuration remains fail-closed.

`accounting_connections` stores the encrypted OAuth material and the verified
FreeAgent environment, company name and company subdomain. Billing settings
exposes this connection identity and offers a state-preserving reauthentication
flow; it never renders credentials or token material.

## Current live boundary

The deployed Sandbox connection is `CONNECTED` for Fox Learning Ltd
(`foxlearningltdgmailcom`). Contact `257175` is stored as one verified
Sandbox mapping with no conflict. The live
`accounting_billing_settings`, `accounting_outbox` and
`accounting_retry_audit` tables are empty because no executable commercial
approval or invoice-producing event exists.

The latest acceptance handoff contained literal placeholders for the
`ADMIN_CANCELLED` consequence, effective-date policy and billing/category
configuration. Placeholders are not valid configuration; the service must
continue to fail closed and must not create an outbox mutation or provider
request until explicit approved values are supplied.

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
encrypted OAuth material only in D1. Every production accounting path passes
an explicitly bound `globalThis.fetch` wrapper, including the OAuth callback,
token exchange, scheduled outbox processing, contact verification and
reconciliation.

Normal lesson invoice configuration starts at `55.00` GBP and is editable by
an admin through the billing settings page. GBP is always enforced; amount,
item type, category URL, payment terms and the explicit FreeAgent invoice
line-item `sales_tax_rate` are validated before saving and before a provider
request. The current zero rate represents the non-VAT-registered business and
prevents FreeAgent contact/company defaults from adding VAT. Missing,
malformed or implicit values fail before a provider request. Amounts are parsed
and formatted as fixed two-decimal minor units; no floating-point arithmetic
is used. This follows FreeAgent's invoice sales-tax model:
<https://dev.freeagent.com/docs/sales_tax>.

## Billing-ledger extension

The forward-only `0021_billing_ledger.sql` migration adds the durable billing
boundary described in [billing-freeagent.md](billing-freeagent.md). It keeps
lesson billing events, customer credits, ledger transactions, invoice
applications and authorised refunds in FoxTutor while retaining FreeAgent as
the provider document and payment authority.

The migration deliberately does not invent a category, tax treatment,
accounting date or commercial price. Those values remain explicit billing
configuration or human approval inputs.

## Provider acceptance scope

The FreeAgent adapter now has seams for credit-note creation, credit-note
retrieval/status transitions, contact mandate-state reads and documented
GoCardless initiation. Credit-note-to-invoice matching is not exposed in the
official public API documentation, so the application records a recoverable
provider-reconciliation state instead of creating dummy payments or bank
transactions.
