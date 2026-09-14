# Phase 7.2 — Complete billing engine and operationalisation

## Status

The Phase 7.2 application work is implemented around the Phase 7 authority
boundary. Remote deployment and real provider acceptance are separate gates:
FreeAgent remains authoritative for accounting documents and exposed payment
state, while FoxTutor remains authoritative for lessons, billing events,
credits, readiness and audit history.

## Business invariants

- FoxTutor business time is always `Europe/London`; UTC is infrastructure-only.
- Recurrence materialises a bounded inclusive horizon from London today through
  London today plus six weeks.
- A recurring series is the scheduling authority; FreeAgent recurring invoice
  profiles are never used for lesson recurrence.
- Each billable lesson has one deterministic billing event and one local invoice
  identity.
- A fully credit-covered lesson is settled locally and never creates a
  zero-value FreeAgent invoice or Direct Debit operation.
- Collection eligibility is the lesson date minus seven calendar days, subject
  to a sent invoice, positive outstanding amount, active FreeAgent mandate and
  no unresolved prior collection.
- `PAYMENT_SECURED` means either full FoxTutor credit coverage or a provider
  payment confirmed by FreeAgent. Submission or scheduling alone is not secure.

## Operational surfaces

- `/learn/admin/series` creates and controls recurring series.
- `/learn/admin/billing` shows today, the next seven days, payment readiness,
  customer credit and actionable alerts.
- Invoice and credit detail pages preserve lesson, ledger and provider links.
- `/learn/student/billing` shows credit, upcoming charges and chronological
  billing history in plain language.
- Alert acknowledgement and resolution are persisted with actor/time audit.

## Provider boundary and limitations

The existing FreeAgent-GoCardless integration is retained. FoxTutor does not
create an independent GoCardless mandate or payment authority. Mandate setup is
performed through the connected FreeAgent contact workflow and FoxTutor only
collects after FreeAgent exposes an active mandate.

FreeAgent's documented public API supports invoice and credit-note creation,
transitions and status reads, but does not document credit-note-to-invoice
matching. Cancellation after an issued invoice therefore creates an auditable
FoxTutor credit, a provider-operation record and a reconciliation-required
exception when provider matching is needed. No fake payment, refund or bank
transaction is written.

## Recovery and reconciliation

Provider operations use deterministic keys and atomic claims. Network/timeout
outcomes become `UNKNOWN` and reconciliation-required alerts rather than
automatic duplicate creation. Invoice reconciliation refreshes provider status
and can confirm payment state without creating a second invoice. Alert state is
deduplicated and acknowledge/resolve actions are auditable.

## Acceptance boundary

Controlled seam tests cover recurrence, London DST, credits, cancellation,
invoice/payment lifecycle, provider failures, unknown outcomes and replay.
Real FreeAgent or GoCardless evidence must be recorded separately and must not
be inferred from seam tests. A remote schema/runtime release is safe only after
the local checks and configuration/approval gates pass.
