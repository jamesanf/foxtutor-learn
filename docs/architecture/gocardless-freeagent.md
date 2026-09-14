# FreeAgent and GoCardless integration decision

Phase 7.2 uses the existing **FreeAgent -> GoCardless** integration. FoxTutor
reads the mandate state from the mapped FreeAgent contact and initiates an
eligible invoice Direct Debit through FreeAgent. FoxTutor does not create a
second GoCardless mandate or payment authority.

FreeAgent documentation exposes mandate states including `setup`, `pending`,
`inactive`, `active` and `failed`, and documents that first collections can
take substantially longer than later collections. The payment-readiness
calculator therefore keeps scheduled, pending, confirmed, failed and unknown
states separate.

FoxTutor uses `collection_date = lesson_date - 7 calendar days` in
Europe/London. A collection operation being submitted or marked pending is not
payment-secured; only full local credit coverage or a confirmed provider
payment is considered secure for lesson readiness. First collection timing is
kept separate from later recurring collections.

The official public FreeAgent API does not document a customer-facing mandate
request endpoint or credit-note-to-invoice matching endpoint. The customer
setup experience remains the FreeAgent-supported workflow, and a local credit
application remains reconciliation-required until supported provider state
confirms its accounting effect.

This decision avoids duplicate mandates, conflicting payment ownership and
unreconcilable provider state. A direct GoCardless Billing Request integration
must not be introduced unless FreeAgent linkage, mandate visibility,
duplicate prevention and payment reconciliation are proven explicitly.
