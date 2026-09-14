# Phase 7.1 - RECURRENT LESSONS + BILLING ORCHESTRATION + PAYMENT READINESS

## Status

**PHASE 7.1 STATUS: LOCAL IMPLEMENTATION COMPLETE; PROVIDER ACCEPTANCE OPEN**

Phase 6 provides the FreeAgent accounting boundary, encrypted OAuth
connection, verified contact mapping, durable accounting outbox and the first
FoxTutor credit-ledger tables. Phase 7.1 extends that boundary without making
FreeAgent recurring invoice profiles authoritative for lesson recurrence.

No remote D1 migration, Worker deployment or provider financial mutation is
authorised by this document. Local implementation and controlled seams must
pass before deployment is considered.

The local implementation now passes the complete automated suite (31 test
files, 168 tests), `npm run check`, and D1 migration application through
`0023_credit_ledger_reversal_view.sql`. Remote schema and runtime remain
unchanged.

## Intended scope

- FoxTutor-owned recurring lesson series.
- Six-week rolling lesson materialisation.
- Instance cancellation, future-series cancellation, rescheduling, pauses and
  end dates.
- Deterministic lesson billing events.
- Immutable customer-credit ledger and credit application.
- Individual FreeAgent invoice and credit-note orchestration.
- FreeAgent GoCardless mandate/payment-state reading and safe collection
  eligibility.
- Payment-readiness calculation, alerts and reconciliation work.
- Admin credit lifecycle visibility showing original, consumed, refunded and
  available amounts.

## Ownership boundary

FoxTutor is authoritative for students, payer relationships, lesson series and
instances, cancellation/reschedule/pause history, lesson entitlement, billing
events, customer credit and application audit history.

FreeAgent is authoritative for invoices, credit notes, provider references,
document status and payment information exposed by the API, including the
mandate state exposed on a contact.

The public FreeAgent API does not document credit-note-to-invoice matching.
FoxTutor must not emulate that operation with fake payments or bank
transactions. A local credit application remains reconciliation-required until
provider state confirms the netting operation.

## Provider decision

Use the existing FreeAgent-to-GoCardless integration. FreeAgent's support
documentation states that an existing GoCardless mandate cannot be imported
into FreeAgent, so a parallel direct GoCardless Billing Request would create a
second mandate/payment authority and is not adopted in Phase 7.1.

FreeAgent exposes contact mandate states (`setup`, `pending`, `inactive`,
`active`, `failed`) and a documented invoice Direct Debit initiation endpoint.
The first collection can take up to ten days; a submitted or pending payment
is not treated as cash received or payment secured.

## Dates and readiness

`lesson_date`, `billing_date`, `due_date`, `collection_date`,
`cancellation_date`, `credit_note_date` and provider settlement dates remain
separate. The business collection rule is:

```text
collection_date = lesson_date - 7 calendar days
```

Payment readiness is a derived, explicit state and is never inferred solely
from an invoice existing or a Direct Debit request being submitted.

## Acceptance gate

Phase 7.1 is not complete until the implementation and test matrix in the
master plan pass, local migration/build checks are clean, provider limitations
are documented, and any real Sandbox evidence is clearly separated from
provider-independent controlled-seam evidence. Production deployment and
financial mutation remain gated by the Phase 6 commercial/provider approvals.

The implementation and local gates are complete. The phase remains
operationally open and is not declared accepted because no real FreeAgent or
GoCardless Sandbox financial evidence has been performed.
