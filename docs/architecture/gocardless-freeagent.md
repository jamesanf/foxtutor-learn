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

The official public FreeAgent API documents contact create/read/update and
contact `direct_debit_mandate_state`, plus invoice Direct Debit initiation. It
does not document a mandate-request creation endpoint, invitation endpoint,
authorisation-link generator or supported redirect for starting setup. The
customer setup experience therefore remains the FreeAgent-supported UI
workflow: one administrator initiation per customer, followed by secure
provider-side authorisation and automatic FoxTutor reconciliation. FoxTutor
must not scrape the UI or call private endpoints.

Phase 7.6 stores one customer-level Direct Debit billing account and sends
idempotent setup/pending notifications. It stores no bank details or raw
provider payment payloads. A local credit application remains
reconciliation-required until supported provider state confirms its
accounting effect.

This decision avoids duplicate mandates, conflicting payment ownership and
unreconcilable provider state. A direct GoCardless Billing Request integration
must not be introduced unless FreeAgent linkage, mandate visibility,
duplicate prevention and payment reconciliation are proven explicitly.
