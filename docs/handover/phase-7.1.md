# Phase 7.1 handover

## Implemented

The local implementation provides FoxTutor-owned recurring series, six-week
materialisation, cancellation/rescheduling/pause/end-date semantics, lesson
billing events, credit allocation and reversal, FreeAgent invoice/Direct Debit
orchestration seams, readiness states, alerts and reconciliation state.

## Not yet evidenced

No real FreeAgent Sandbox invoice, credit note, payment or mandate mutation was
performed. No GoCardless Sandbox mandate or payment flow was performed. The
automated tests and local D1 run are controlled/provider-independent evidence.

## Human-only gates

Human action is limited to accounting/legal policy approval, provider/customer
authorization where required, unavailable credentials and production release
authorization. Technical tests, migrations, deployment inspection and fixture
creation remain automated engineering work.
