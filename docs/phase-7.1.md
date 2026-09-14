# Phase 7.1 - RECURRENT LESSONS + BILLING ORCHESTRATION + PAYMENT READINESS

## Status

**PHASE 7.1 STATUS: FOUNDATIONAL SCOPE ABSORBED INTO PHASE 7.2**

This document records the original Phase 7.1 boundary. Phase 7.2 supersedes
its local-only deployment boundary and completes the unfinished technical work.

Phase 6 provides the FreeAgent accounting boundary, encrypted OAuth
connection, verified contact mapping, durable accounting outbox and the first
FoxTutor credit-ledger tables. Phase 7.1 extends that boundary without making
FreeAgent recurring invoice profiles authoritative for lesson recurrence.

The current deployment record is maintained in
[`docs/deployment/phase-7.2.md`](deployment/phase-7.2.md). Real provider
financial acceptance remains separately gated and is not inferred from the
deployed schema/runtime.

The foundational implementation now passes the complete automated suite and
has been extended by Phase 7.2 through migration `0024`; see the Phase 7.2
testing and acceptance records for current evidence.

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

The implementation and local gates are complete. Real FreeAgent and
GoCardless Sandbox evidence remains a separate provider acceptance activity;
Phase 7.2 does not fabricate that evidence.
