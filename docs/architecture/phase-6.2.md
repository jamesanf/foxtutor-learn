# Phase 6.2 — Commercial boundary and accounting operations

## Current state

Phase 6.2 hardening is implemented locally, but Phase 6 is **not closed**.
No FreeAgent credentials, OAuth connection, contact mapping, financial
configuration or external acceptance evidence is present in this repository or
the production Worker.

The application remains an operational tutoring system. FreeAgent is the
accounting authority; Learn stores event identity, delivery state, safe
provider metadata, explicit contact references and encrypted OAuth material
only.

## Phase 5 contract consumed

| Phase 5 classification | Current boundary behavior |
| --- | --- |
| `NO_CHARGE` | `NOT_REQUIRED`; no FreeAgent action |
| `CANCELLATION_PENDING_DECISION` | No final accounting event |
| `EXCEPTION_WAIVED` | `NOT_REQUIRED`; no FreeAgent action |
| `RESCHEDULED` | `NOT_REQUIRED`; no FreeAgent action |
| `ADMIN_CANCELLED` | Fail closed with `BUSINESS_MAPPING_REQUIRED`; no invoice is created |

`ADMIN_CANCELLED` remains an explicit commercial decision for the business.
The code does not guess whether it means no charge, a full charge, a credit or
another adjustment. Any unsupported or incomplete classification is visible
and blocked before a provider mutation.

The current operational date contract is the UTC date of the committed
Phase 5 history mutation, converted to `YYYY-MM-DD` once. A retry does not
recalculate it. This date policy is provisional until the commercial owner
approves the final accounting contract.

The following remain required commercial decisions before an invoice action
can be enabled:

- amount source and gross/net meaning;
- integer minor-unit and rounding policy;
- payer authority (student, parent/carer or another entity);
- FreeAgent item/category and nominal mapping;
- VAT/tax treatment;
- currency;
- approved `ADMIN_CANCELLED` consequence;
- final effective-date policy.

No financial value is inferred from presentation fields or email matching.

## Explicit contact mapping

The current operational mapping is an explicit admin-managed Learn
student/payer record to a FreeAgent `CONTACT` reference. It is never created
from a matching email address. An admin must submit a numeric contact ID and
the server verifies it against the connected FreeAgent company before storing
the mapping.

Mappings store only the external reference, canonical provider URL, status,
verification timestamp, environment, company subdomain and safe verification
failure metadata. `VERIFIED` mappings are rejected if the stored environment
or company identity no longer matches the active connection.

The relationship is an integration control, not approval of the unresolved
commercial payer policy.

An admin may replace a mapping after re-verification or remove it when no
pending, processing, retryable or unknown outbox event still depends on it.
Succeeded accounting history and external references are retained.

## FreeAgent contract checked

The official FreeAgent Developer documentation was checked on 2026-09-13:

- OAuth 2.0 approval: `/v2/approve_app`;
- token exchange and refresh: `/v2/token_endpoint`;
- sandbox authority: `https://api.sandbox.freeagent.com`;
- production authority: `https://api.freeagent.com`;
- company identity: `/v2/company`;
- contacts: `/v2/contacts`;
- invoices: `/v2/invoices`;
- minimum documented access level for contacts/company: `Time`;
- minimum documented access level for invoices: `Estimates and Invoices`;
- invoice dates use `YYYY-MM-DD`;
- invoice payment terms are integer days;
- invoice currency defaults to the company currency when omitted;
- access tokens are bearer tokens and the documented token lifetime is one hour;
- authorization codes expire after fifteen minutes.

Provider-specific behavior remains isolated in
`src/accounting/freeagent/client.ts`. Relative request paths are constrained
to the expected FreeAgent origin, response URLs are allowlisted, provider
responses are normalized into stable local error categories, and raw provider
bodies are not stored.

## Operational hardening

Migration `0017_accounting_operations.sql` adds:

- verified/invalid contact mapping state and safe verification metadata;
- additive `accounting_retry_audit` records for every admin retry request,
  including actor, role, prior status, result, resulting status, safe error
  and provider reference.

Manual retry remains CSRF-protected, admin-only, state-checked and tied to the
same outbox ID and deterministic business-event idempotency key. Unknown
provider outcomes remain reconciliation-only and are never blindly recreated.

Connection setup now pins the configured FreeAgent environment and company
subdomain. A connection from the wrong company or an environment switch is
rejected.

## Deliberate non-scope

Learn does not implement direct debit, card charging, payment collection,
payment-method storage, invoice browsing, payment history, balances, bank
details or a second accounting ledger.
