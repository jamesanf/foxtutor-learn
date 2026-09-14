# Phase 7.6 — Direct Debit-first billing and reliability

## Engineering result

Phase 7.6 makes Direct Debit the normal customer billing rail. A student
cannot select PAYG, cards, bank transfer or an invoice-level payment method.
The only emergency exception is an administrator-only, reason-required,
audited billing-event record used before provider invoicing when a last-minute
lesson cannot reasonably wait for Direct Debit setup. It is not a customer
setting and is not rendered in student pages or notifications.

Each student now has one local billing account with immutable
`payment_method = DIRECT_DEBIT`, provider contact correlation, reconciled
mandate state, provisioning state, safe error state and notification cooldown
metadata. No bank account number, sort code, payment credential or raw
provider payload is stored.

Student creation creates the local account and automatically finds or creates
the FreeAgent contact using documented contact APIs. Existing local mappings
are verified before discovery. Local claims and read-before-create
reconciliation prevent duplicate contacts during retries or concurrent Worker
invocations. FreeAgent's documented mandate states are reconciled to
`SETUP_REQUIRED`, `AUTHORISATION_PENDING`, `ACTIVE`, `FAILED`, `INACTIVE` or
`UNKNOWN`.

FreeAgent's public API does **not** document mandate-request creation,
invitation-link generation or a supported redirect for starting authorisation.
Therefore the remaining provider-side action is one FreeAgent UI initiation
per customer. FoxTutor prepares the customer, notifies them safely, and
reconciles the result automatically; it does not scrape FreeAgent or call
private endpoints.

## Scheduler and sentinel

The existing `*/5 * * * *` Worker trigger remains the only trigger. It runs
bounded provisioning work on due accounts and executes the sentinel once at
03:00 Europe/London per business date. The sentinel never creates invoices,
mandates, customers, credits, refunds or payments. It performs bounded
`LIMIT 1`/schema checks for billing links, Direct Debit state, invoice and
payment invariants, credit balances, recurrence and stale collections.

One successful run writes one small run record. Diagnostic alerts are
deduplicated by code, retain safe context only, and reopen/update on recurrence
without alert flooding. The expected daily footprint is one Worker invocation
for the sentinel, at most ten targeted D1 reads plus one bounded alert update
per diagnostic, and no provider mutation request. The normal five-minute
worker retains its existing bounded billing and notification batches.

## Acceptance boundary

The repository has automated coverage for the Direct Debit state machine,
zero-value minor-unit readiness, customer UI privacy/policy, migration
contracts, emergency policy, FreeAgent adapter safety and sentinel
non-mutation. Production authenticated browser acceptance and real provider
Sandbox financial mutation remain separate gates; no production financial
mutation is used as a test.
