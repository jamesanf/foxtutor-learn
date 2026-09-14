# PHASE 7.1 ACCEPTANCE REPORT

## 1. Executive summary

Phase 7.1 is implemented and validated locally. It is **NO-GO for production
and provider acceptance** because no remote migration, Worker deployment or
financial Sandbox mutation has been authorized or performed.

## 2. Architecture implemented

FoxTutor owns recurring lesson series, bounded instances, billing events,
customer credit and payment readiness. FreeAgent remains the accounting and
provider-state boundary. FreeAgent recurring invoice profiles are not used.

## 3. Recurring lesson model

Weekly Europe/London series support start/end dates, pauses, overrides,
single-instance cancellation, future-series cancellation and audit history.

## 4. Six-week horizon

The scheduler maintains an inclusive current-date-plus-six-weeks window,
using deterministic recurrence keys and unique constraints for replay and
overlapping-worker safety.

## 5. Cancellation model

Future unbilled cancellations suppress billing and create FoxTutor credit.
Already-invoiced correction remains a provider credit-note/reconciliation path;
issued invoices are never silently deleted or altered.

## 6. Billing-event model

Every materialised billable lesson has one idempotent billing event with
separate lesson, billing, due and collection dates and provider references.

## 7. Customer credit model

Credits are immutable ledger grants with oldest-first allocation, auditable
consumption/refund/reversal movements and a full lifecycle admin view.
Definite invoice failures compensate allocations; unknown outcomes remain
reconciliation-required.

## 8. FreeAgent integration

Individual invoices are created and marked sent through the existing adapter.
Credit-note matching is not automated because the public API does not document
that operation. Zero-net lessons do not create zero-value invoices.

## 9. GoCardless integration

The existing FreeAgent-GoCardless path is used. No direct GoCardless mandate
integration was introduced. Mandate state is read from the mapped FreeAgent
contact and collection is gated by active mandate and collection date.

## 10. Payment-readiness calculation

The calculator implements the seven-day collection rule and distinct
not-due, credit-covered, outstanding, mandate-pending, scheduled, pending,
confirmed, failed, unknown and reconciliation-required states.

## 11. Alerting

Alerts are deduplicated and linked to student/payer, lesson, event, invoice and
provider state for invoice failures, timeouts, mandate failures, payment
unknowns and reconciliation work.

## 12. Reconciliation

Provider references, invoice/payment state and operation status are retained.
Unknown results are not blindly retried and are surfaced for reconciliation.

## 13. Test matrix and results

Controlled/provider-independent evidence: `npm test` passes with 31 files and
168 tests; `npm run check` passes; local D1 migrations through `0023` apply;
expected Phase 7.1 tables and view exist. Additional provider-seam acceptance
remains outstanding.

## 14. Remote schema/deployment state

Remote D1 and the deployed Worker remain at the Phase 6 boundary. No remote
Phase 7.1 migration or deployment was performed.

## 15. Real Sandbox evidence

FreeAgent Sandbox evidence: none for Phase 7.1 financial mutations.

## 16. Controlled-seam evidence

Recurrence, readiness, migration contracts, cancellation/reschedule seams,
provider error handling and build/deployment dry-run passed locally.

## 17. Remaining technical gaps

Provider-side credit-note matching and mandate setup are not documented as
public FreeAgent API operations. Full browser/admin history UX remains Phase
7.2 scope. Remote provider reconciliation has not been exercised.

## 18. Remaining human decisions

Approve accounting/legal billing policy, authorize Sandbox financial testing,
provide any required provider credentials/authorization, and authorize
production migration/deployment. These are genuine provider or policy gates.

## 19. Phase 7.1 GO / NO-GO

**NO-GO** for remote deployment and financial acceptance. **GO** for the local
implementation and controlled engineering evidence.
