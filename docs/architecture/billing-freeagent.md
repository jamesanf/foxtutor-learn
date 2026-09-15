# FoxTutor billing and FreeAgent boundary

## Recommendation

Use **FoxTutor-generated, lesson-level billing events** with FreeAgent as the
accounting-document and payment-state authority. Do not make a FreeAgent
recurring-invoice profile authoritative for lesson entitlement.

The existing FreeAgent recurring-invoice capability is useful for a genuinely
fixed commercial schedule, but it cannot safely express FoxTutor's
student-specific lesson dates, pauses, moved lessons, cancellations, credits,
or the collection rule "seven days before this individual lesson". The
recommended boundary is therefore:

```text
FoxTutor lesson schedule
  -> immutable billing event and date snapshot
  -> FoxTutor customer-credit ledger
  -> invoice preparation and deterministic credit allocation
  -> FreeAgent invoice / credit note document
  -> FreeAgent payment and GoCardless state
```

FoxTutor is authoritative for students, payer relationships, lesson
entitlement, cancellations, credit balance, billing schedule and
idempotency. FreeAgent is authoritative for the invoice or credit-note
document, provider reference, document status, payment state and
GoCardless mandate state exposed by the API.

## Dates

The data model stores these independently:

| Date | Meaning |
| --- | --- |
| `lesson_date` | The scheduled lesson date from FoxTutor. |
| `billing_date` | The accounting-document date selected by the approved accounting policy. |
| `due_date` | The invoice payment due date, if configured. |
| `collection_date` | The Direct Debit collection policy date. The default algorithm is seven calendar days before the lesson date. |
| `cancellation_date` | When the cancellation event was recorded. |
| `credit_note_date` | The date used for the FreeAgent credit note. |
| `payment/refund date` | Provider or refund-operation dates, recorded when those operations occur. |

The seven-day rule is a collection policy only. It does not select an
accounting date or credit-note date.

## Customer credit ledger

`customer_credit_accounts` is a guarded account cache. The source of truth is
the immutable `credit_ledger_transactions` history:

- `GRANT` records a cancellation credit;
- `CONSUMPTION` records credit applied to a specific local invoice;
- `REFUND` records an explicitly authorised cash refund;
- `REVERSAL` records a compensating correction.

`customer_credits` retains the original amount, source lesson, source
cancellation, payer, provider credit-note reference and deterministic
idempotency key. The `customer_credit_balances` view exposes original,
consumed and remaining amounts from the ledger. Database triggers reject
over-consumption and update the account cache only after a ledger insert.

Cancellation replay is safe because the source event and grant idempotency
key are unique. Invoice replay is safe because each invoice/credit allocation
has a unique idempotency key and ledger transaction. Refunds are separate
auditable records and never happen as a side effect of cancellation.

## Invoice and credit application

The ledger and invoice tables provide the durable seam for lesson-level
billing, deterministic oldest-credit-first allocation, and replay-safe
reconciliation. The Phase 7.2 Worker prepares individual invoices, applies
local credit, settles fully covered lessons without a zero-value provider
invoice, and schedules Direct Debit operations only after the seven-day
collection date and mandate checks pass. Invoice status reconciliation,
payment reconciliation, alert acknowledgement and billing-history projections
are now part of the operational boundary. Real provider mutations still
require the Phase 6 accounting approvals and explicit Sandbox evidence.

## Student billing-history pagination

The student billing page uses the shared Learn pagination controls with a
default page size of 12 and supported sizes of 24 and 48. D1 counts the six
independent history sources before rendering the requested page, while the
history rows retain their single deterministic descending date order. Provider
environment filtering is applied consistently to invoice and payment rows in
both the count and data queries, so pagination cannot reveal records from the
other accounting environment.

Credit consumption is finalized locally with an immutable ledger entry. A
definite provider failure creates a compensating `REVERSAL`; an unknown or
timeout outcome does not release credit and instead marks the invoice and
operation for reconciliation.

The admin Accounting page treats the first Production FreeAgent connection
card as the page-heading's first content block. Its top margin is removed so
the page heading's bottom spacing is not doubled by the generic card margin;
later accounting cards retain the shared card rhythm.

When the invoice worker is enabled, the intended order is: establish the
local billing event and invoice identity, establish the provider invoice,
then record local credit consumption. A zero-net local invoice must never
initiate a Direct Debit collection. Because the public API does not document
credit-note matching, a local application is not reported as provider
settlement; it remains a reconciliation-required state until the provider
document is actually netted.

## FreeAgent API findings

The following capabilities were confirmed from the official documentation:

| Resource / endpoint | Capability |
| --- | --- |
| `/v2/company` | Read company identity, including subdomain. |
| `/v2/contacts` and `/v2/contacts/:id` | List/get contacts; create/update is documented. Contact responses expose `direct_debit_mandate_state` values `setup`, `pending`, `inactive`, `active`, and `failed`. |
| `/v2/categories` | Read company-specific categories; category URLs must come from the intended company. |
| `/v2/invoices` | Create/read/update invoices. New invoices begin as `Draft`; invoice items accept explicit `sales_tax_rate`; invoice responses expose `payment_methods`. |
| `/v2/invoices/:id/transitions/mark_as_sent` | Mark an invoice sent. |
| `/v2/invoices/:id/direct_debit` | Initiate GoCardless Direct Debit for a sent, eligible GBP invoice with an active pre-authorised mandate and no previous payment. |
| `/v2/credit_notes` | Create/read/update/delete credit notes. New credit notes begin as `Draft`; status transitions include `mark_as_sent` and `mark_as_draft`. |
| `/v2/recurring_invoices` | Read recurring invoice profiles, including frequency, next recurrence and status. This is not a safe source of truth for variable lesson entitlement. |
| `/v2/accounting/transactions` | Read accounting transactions for reconciliation. |

## Phase 7.14 independent connections, contact verification and callback verification

> This section supersedes the Phase 7.9, Phase 7.11 and Phase 7.12
> environment-selection wording for the current implementation. Those records
> remain historical evidence.

FreeAgent Sandbox and Production are separate provider connection identities:
`FREEAGENT:SANDBOX` and `FREEAGENT:PRODUCTION`. Both may be connected at once.
The `FREEAGENT_ENVIRONMENT` binding is only a legacy/default operational
selection for existing scheduled billing paths; it does not determine which
connection exists or which admin OAuth action is used. Production does not use
the legacy generic Sandbox credential fallback.

Each connection has independent API origins, OAuth credentials, redirect
configuration, encrypted token records, company pins, contact mappings,
company verification and category mapping. Migration `0030` adds the
per-environment billing settings table and OAuth provider/redirect binding.

The admin page exposes explicit `Connect/Reauthenticate Sandbox` and
`Connect/Reauthenticate Production` actions. Each action generates
`/v2/approve_app` on its own FreeAgent API host. The one-time OAuth state is
bound to provider, environment, administrator, redirect intent, expiry and
consumption; the callback uses only that validated state to exchange the code,
verify the selected company and persist the selected connection. A callback
failure is surfaced to the administrator and marks an existing connection
`ATTENTION`; a successful upsert records `last_success_at` and clears stale
errors.

### Invoice category mapping

The admin accounting settings page reads company-specific categories through
`GET /v2/categories` using the authenticated connection for the selected
environment. FreeAgent returns four collections:
`admin_expenses_categories`, `cost_of_sales_categories`, `income_categories`
and `general_categories`. FoxTutor maps their `description`, `nominal_code`,
provider URL and group into one deterministic list, removes duplicate URLs and
displays the description and nominal code. The approved Sandbox category
defines the FoxTutor sales policy. Production resolves its own
company-specific category by group, normalized description and nominal code; a
unique match is stored, while ambiguity and no-match conditions require an
explicit administrative decision. Normal operation shows the fixed configured
mapping rather than the full provider catalogue. A category URL is accepted
only when its API origin matches the selected environment, and the persisted
mapping is also bound to the connected company subdomain. A Sandbox category
can therefore never be reused for Production, even if the URL shape is
otherwise valid.

The established defaults remain £55.00, `Unit`, 0 payment terms days, GBP
and 0% sales tax. These defaults describe normal lesson accounting and do not
authorize a provider invoice. A controlled Sandbox acceptance amount is a
separate operation.

`Unit` is intentional: one unit represents one 55-minute FoxTutor lesson.
Legacy persisted `Hours` settings are normalized to `Unit` by migration
`0035_invoice_item_type_unit.sql`, so FreeAgent does not describe a lesson as
an hour.

### Contact verification

Contact verification carries the selected `sandbox` or `production`
environment through the admin operation. The connection, token, API origin,
company-bound mapping and failure record all use that same environment.
Sandbox and Production contact IDs are independent and may differ for the same
student. The provider contact is read-only; its direct-debit mandate state is
logged only as safe normalized diagnostic metadata.

The FreeAgent support documentation confirms that GoCardless can be
configured for invoice date, payment due date or manual triggering. It also
confirms that an active mandate is required, that setup is initiated from
FreeAgent, and that mandate setup can take up to three working days.

### Provider limitation

The official public API documentation does **not** document an endpoint for
matching/applying a credit note to an invoice. FreeAgent documents that
operation in the web UI (`Apply to invoice`). FoxTutor therefore does not fake
the operation with a bank transaction, payment or dummy receipt. It records
the local allocation, stores the FreeAgent credit-note reference, marks the
provider operation as requiring reconciliation, and leaves the actual
provider netting to an explicit supported provider workflow.

Likewise, the API documentation does not expose a mandate-request creation
endpoint. FoxTutor can display the mandate state returned by the contact API,
but the customer setup path remains the FreeAgent contact UI/email flow.

## GoCardless safety

The adapter can read mandate state, request a GoCardless-enabled invoice and
invoke the documented Direct Debit endpoint. The collection orchestration is
not enabled in the current Worker. Any future collection worker must require
all of these conditions:

1. the invoice is sent and provider-eligible;
2. the local collection date has been reached;
3. the lesson is not cancelled;
4. the local net amount is greater than zero; and
5. the Direct Debit operation idempotency key has not already succeeded.

The seven-day date is computed from the lesson date, not from a generic
recurring profile. A provider payment can remain pending, fail, or become
unknown; those states are retained for reconciliation and are not treated as
successful payment.

## Customer-level Direct Debit provisioning

Each student has one `billing_accounts` row with immutable
`payment_method = DIRECT_DEBIT`. It stores only safe provider contact
references, mapped mandate/provisioning state, reconciliation timestamps,
notification cooldown metadata and bounded safe errors. It never stores bank
account details, sort codes, payment credentials or raw provider payloads.

Student creation and scheduled retries use documented FreeAgent contact
list/get/create/update operations. A verified local mapping is read first;
an exact email match is reused; ambiguous matches fail closed; and a contact
is created only when no match exists. A local claim prevents concurrent
duplicate work and a timeout is reconciled before retrying. Mandate setup is
not created through FoxTutor because the public API does not document that
capability. The administrator performs the one-time FreeAgent UI initiation;
the secure provider flow then remains outside FoxTutor.

## Contact mapping

The current admin screen uses a compact numeric FreeAgent contact-ID control
and an explicit verification step. The mapping is the only identity used for
financial operations; email is not used as an identity key. A changed name or
email is a contact-synchronisation concern, while an existing mapping conflict
is a fail-closed condition. The company environment and subdomain are pinned
when the mapping is verified.

The automatic find-or-create synchronization now preserves the explicit local
mapping, prevents duplicate contacts, verifies the connected company
environment, and fails closed on ambiguous matches. Existing manual mapping
remains available for exceptional reconciliation.

## Current implementation boundary

Implemented locally:

- durable lesson/cancellation billing and credit-ledger schema;
- replay-safe cancellation credit grants;
- deterministic credit allocation and refund finalization seams;
- weekly recurring series with six-week materialisation, pauses, end dates,
  instance cancellation and rescheduling;
- lesson-level invoice and Direct Debit orchestration with payment readiness;
- billing alerts, payment history and provider reconciliation state;
- FreeAgent contact mandate, credit-note and Direct Debit adapter methods;
- customer-level Direct Debit provisioning, idempotent notifications and
  provider-state reconciliation;
- a once-per-London-day bounded billing sentinel integrated into the existing
  Worker scheduler;
- feature-flagged, retryable credit-note provider operations.

Not deployed or provider-verified:

- automatic credit-note-to-invoice matching, because no public API endpoint is
  documented;
- automatic refund provider mutation;
- customer-facing mandate initiation through FoxTutor, because FreeAgent does
  not document a mandate-request creation endpoint; the one-time FreeAgent UI
  action remains explicit.

## Phase 7 links

Stable links now exist for:

```text
lesson -> billing_event -> billing_invoice
lesson -> cancellation history -> customer_credit -> ledger transaction
customer_credit -> credit-note provider reference
billing_invoice -> credit application -> payment/refund operation
```

This keeps billing history reconstructable without deriving the entire history
from a current balance or from FreeAgent's recurring profile.
