# Phase 7.5 financial safety testing record

## Status

**NOT READY.** This record defines the acceptance model and records the
engineering evidence. It does not treat local tests, a connected FreeAgent
Sandbox OAuth session, or a deployed Worker as proof that real financial
mutations are safe.

## State model

### Lesson

`scheduled` is an entitled future lesson. `paused` is a recurring-series
control state and suppresses materialisation during the pause interval.
`rescheduled` is represented by the unchanged lesson identity with an instance
override. `cancelled` is retained history and suppresses future billing.
`completed` is a finished lesson. `ended/suppressed` is represented by a
series end/cancel state or a non-materialised occurrence, never by deleting
historical rows.

### Billing event

`PENDING` means a local billable event exists and has not completed invoice
processing. `INVOICE_PENDING` means local invoice preparation is in progress.
`INVOICE_CREATED` means a provider invoice reference is recorded.
`SETTLED` means credit coverage or confirmed provider payment has secured the
lesson. `FAILED` is a definite provider failure. `UNKNOWN` means the result of
an external operation is not known and must be reconciled. A
`reconciliation-required` outcome is represented by `UNKNOWN` plus an
actionable reconciliation task/alert; it is never treated as success.

### Invoice

Local invoice states are `PENDING_PROVIDER`, `DRAFT`, `SENT`,
`PAYMENT_PENDING`, `PAID`, `FAILED`, `UNKNOWN`, and `CANCELLED`.
`SENT`/`outstanding` is not paid. `PAYMENT_PENDING` is collection processing,
not receipt of money. `UNKNOWN` requires provider lookup. Cancellation after
invoice preserves the invoice and follows the explicit reconciliation path.

### Credit

Credits begin `AVAILABLE`, become `PARTIALLY_CONSUMED` or `CONSUMED` through
immutable ledger entries, and may be `REFUNDED` only through an explicitly
authorised refund. A provider-failure compensation is a `REVERSAL` ledger
entry, not an edit to history. Any disagreement is reconciliation-required.

### Direct Debit mandate

FreeAgent exposes `setup`, `pending`, `active`, `inactive`, and `failed`.
FoxTutor maps these to `SETUP_REQUESTED`, `PENDING_AUTHORISATION`, `ACTIVE`,
and `FAILED`. A missing verified contact is `NOT_CONFIGURED`; an unavailable
or unrecognised provider response is `UNKNOWN`. Raw provider enums and
identifiers are not rendered to students.

### Payment

`NOT_STARTED`, `SCHEDULED`, `PENDING`, `CONFIRMED`, `FAILED`, and `UNKNOWN`
are distinct local states. Only `CONFIRMED` or full local credit coverage is
payment-secured for lesson readiness. Submitted or pending collection is never
rendered as paid.

## Financial invariants

1. Credit balance equals grants plus reversals minus consumption and authorised
   refunds; no balance mutation occurs without an immutable ledger entry.
2. A billing event has one idempotency identity and at most one local invoice.
3. A lesson has at most one active external collection obligation.
4. Cancellation retains audit history, does not grant duplicate credit, does
   not create negative credit, and suppresses collection for cancelled lessons.
5. Recurrence creates lesson identity independently of billing state.
6. Unknown provider results are never treated as success and are not blindly
   retried.
7. All money is represented in GBP minor units and never calculated with
   floating point values.

## Engineering test matrix

The existing suite covers recurrence, pause/end-date materialisation, DST,
credit allocation and reversal seams, payment readiness, provider error
classification, authorization, student ownership, migrations, and the
production D1 compound-select regression. Phase 7.5 adds the Direct Debit
state mapping and customer-privacy contract.

The next required automated expansion is parameterised integration coverage
against the local D1 schema for credit-ledger triggers, cancellation after
invoice, concurrent claims, scheduler replay, reconciliation deduplication,
and all billing-history source/limit combinations. These are engineering
requirements, not human approval gates.

## Failure injection requirements

The acceptance suite must exercise D1 failure/timeout/malformed rows,
provider timeout/429/5xx/malformed responses, duplicate provider objects,
stale processing claims, concurrent billing/credit/cancellation operations,
and repeated reconciliation. Every unknown outcome must create observable
reconciliation work and converge only after an explicit provider lookup.

## Provider and browser evidence boundary

No real Sandbox invoice, credit note, collection, payment, mandate transition,
or cancellation correction is claimed by this record. Authenticated student
and admin browser acceptance also remains outstanding unless recorded with a
legitimate session, response status, rendered content, Ray ID, and safe Worker
stage logs.

The customer Direct Debit wording follows the official FreeAgent guidance:
<https://support.freeagent.com/hc/en-gb/articles/115001218890-Take-payments-with-GoCardless-using-a-Direct-Debit-mandate>.
The customer is directed to the provider's secure email authorisation flow;
FoxTutor Learn does not collect bank details directly.
