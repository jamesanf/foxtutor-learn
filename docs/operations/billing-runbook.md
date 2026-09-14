# Billing operations runbook

## Daily checks

Open `/learn/admin/billing`. Review `Needs attention`, failed payments,
mandate-pending lessons and reconciliation-required items before lessons begin.
Use invoice detail to inspect provider references and credit detail to explain
the ledger balance.

## Unknown provider result

Do not retry blindly. Confirm the provider document by the stored reference,
allow the scheduled reconciliation worker to refresh status, and resolve the
alert only after local and provider state agree.

## Cancellation after invoice

FoxTutor preserves the invoice and creates a local credit. If provider
matching is unsupported, leave the reconciliation-required operation open and
complete the documented provider-side action. Never create a dummy payment or
bank transaction.

## Direct Debit

Mandates are managed by the existing FreeAgent-GoCardless workflow. FoxTutor
does not create a parallel mandate. A submitted or pending collection is not
`PAYMENT_SECURED`; only full credit coverage or confirmed provider payment is
secure.

## Recovery

The scheduler is safe to rerun after downtime. Operations are claimed
atomically, deterministic keys prevent duplicates, and stale processing claims
become unknown/reconciliation work. Investigate D1 contention or repeated
provider failures before changing configuration.
