# Phase 7.9 - Environment-aware FreeAgent acceptance

## Status

The local Phase 7.9 isolation and fail-closed configuration work is complete.
The additive migration is applied remotely and the deployed Worker has
performed a read-only Sandbox contact check. No invoice, payment, mandate,
credit, refund, or Production mutation was performed by this implementation
pass.

The configured runtime environment is selected by the single
`FREEAGENT_ENVIRONMENT` binding and accepts only lowercase `sandbox` or
`production`. The current deployed connection remains Sandbox. The value is
read from the existing Worker secret binding rather than duplicated in
`wrangler.jsonc`.

## Isolation implemented

* Sandbox and Production use distinct API origins, OAuth endpoints, client
  credentials, token encryption keys, company pins, and redirect URI values.
* Production never falls back to the legacy generic Sandbox credentials.
* The existing generic credential names remain supported only for Sandbox so
  the current connection is not silently displaced:
  `FREEAGENT_CLIENT_ID`, `FREEAGENT_CLIENT_SECRET`,
  `FREEAGENT_COMPANY_SUBDOMAIN`, `FREEAGENT_TOKEN_ENCRYPTION_KEY`, and
  `FREEAGENT_OAUTH_REDIRECT_URI`.
* New per-environment connection and contact-mapping tables preserve the
  existing Sandbox records while allowing an independent Production identity.
* Billing accounts, invoices, and payments carry `provider_environment`.
  Provider operations reject a record whose environment differs from the
  selected runtime environment.
* OAuth state already binds the environment; the callback consumes that state
  and exchanges the code using the bound environment's credentials and
  redirect URI.
* The admin billing-chain audit displays `SANDBOX` or `PRODUCTION` explicitly.

## Real Sandbox contact evidence

The existing mapped Sandbox contact was read twice through the deployed
scheduled reconciliation path. Both reads returned HTTP `200`, verified the
mapped contact URL/reference, and contained the same response shape. The
sanitized field-name fixture is:

```text
docs/evidence/real-observed-sandbox-freeagent-contact.md
```

The actual contact object contained ordinary identity, address, invoice
preferences, status, timestamps, and account-balance fields, but no
`direct_debit_mandate_state`, payment method, payment URL, or GoCardless field.
FoxTutor normalized this as `UNKNOWN` with `MANDATE_STATE_MISSING`. This is
provider evidence, not a synthetic fixture, and no active mandate was inferred
from the user's separate FreeAgent UI observation.

The deployed diagnostic log also recorded:

```text
environment=sandbox
status=200
hasDirectDebitMandateState=false
hasPaymentMethod=false
hasPaymentUrl=false
hasGoCardlessState=false
normalizedState=UNKNOWN
diagnosticCode=MANDATE_STATE_MISSING
```

## Sandbox invoice/payment gate

The remote D1 database currently has no `accounting_billing_settings` row and
no existing `billing_invoices` or `accounting_outbox` records for a controlled
test. The deployed Worker therefore has no approved Sandbox category URL,
amount, payment terms, or invoice reference policy from which it could safely
create an invoice. No provider invoice was guessed or created.

This is an explicit acceptance blocker, not a successful invoice test. An
administrator must first configure the approved Sandbox accounting mapping
through the existing admin accounting settings flow. After that configuration,
the minimum controlled test remains one Sandbox invoice, one replay attempt,
and one no-active-mandate payment rejection if the provider exposes that
operation. Settlement states that Sandbox cannot simulate remain fixture-only.

The migration is additive and preserves the existing legacy Sandbox records:

```text
migrations/0028_phase79_environment_isolation.sql
```

Apply it only after reviewing the deployment diff:

```bash
npx wrangler d1 migrations apply foxtutor-learn --remote --config wrangler.jsonc
```

## Required Worker secrets

Secret **names** may be created by an administrator; secret **values** must
never be committed or documented.

| Environment | Required names |
| --- | --- |
| Sandbox | `FREEAGENT_CLIENT_ID`, `FREEAGENT_CLIENT_SECRET`, `FREEAGENT_COMPANY_SUBDOMAIN`, `FREEAGENT_TOKEN_ENCRYPTION_KEY`, `FREEAGENT_OAUTH_REDIRECT_URI` |
| Production | `FREEAGENT_PRODUCTION_CLIENT_ID`, `FREEAGENT_PRODUCTION_CLIENT_SECRET`, `FREEAGENT_PRODUCTION_COMPANY_SUBDOMAIN`, `FREEAGENT_PRODUCTION_TOKEN_ENCRYPTION_KEY`, `FREEAGENT_PRODUCTION_OAUTH_REDIRECT_URI` |

The preferred Sandbox names, which may be added during a controlled secret
rotation, are `FREEAGENT_SANDBOX_CLIENT_ID`,
`FREEAGENT_SANDBOX_CLIENT_SECRET`, `FREEAGENT_SANDBOX_COMPANY_SUBDOMAIN`,
`FREEAGENT_SANDBOX_TOKEN_ENCRYPTION_KEY`, and
`FREEAGENT_SANDBOX_OAUTH_REDIRECT_URI`. They take precedence over the legacy
Sandbox names. Production has no legacy fallback by design.

The exact callback remains:

```text
https://foxtutor.org/learn/admin/accounting/oauth/callback
```

Cloudflare Access must continue to bypass only this exact callback path for
the OAuth exchange. The OAuth state must be present, unexpired, bound to
`FREEAGENT_ENVIRONMENT`, and initiated by the authenticated administrator.

## Direct Debit setup boundary

FoxTutor does not collect bank details, create GoCardless mandates, or claim
that its instructional email is a provider mandate invitation. The official
FreeAgent API surface used by this repository documents contact reads and
Direct Debit invoice payment operations, but no supported public operation for
creating a customer mandate-request invitation was identified.

Therefore the honest capability boundary is:

```text
FoxTutor -> directs the customer/admin to the secure FreeAgent/GoCardless
            setup journey when a provider-hosted action is available.
FreeAgent/GoCardless -> performs authorization and owns mandate state.
FoxTutor -> reads and displays the resulting provider state.
```

Any FoxTutor email is support/instructional only. It must not be described as
an invitation or as authorization of a mandate.

## Acceptance sequence

1. Apply `0028` and deploy the committed Worker with
   `FREEAGENT_ENVIRONMENT=sandbox`.
2. Read the existing Sandbox contact before any mutation and save only a
   sanitized response shape under the label
   `REAL_OBSERVED_SANDBOX_FREEAGENT_CONTACT`.
3. Record the raw mandate value, normalized state, billing readiness, audit
   state, request classification, and timing.
4. Create at most one minimal controlled Sandbox invoice after checking the
   contact, company, category, tax, amount, due date, reference, and
   idempotency key.
5. Re-run the same operation to prove no duplicate invoice.
6. Attempt the documented Direct Debit operation only if the contact has no
   active mandate, and record the provider's safe rejection. Never manufacture
   a mandate or mark a rejected collection as secured.
7. Reconcile after each provider read or mutation and verify the student
   history and admin audit.
8. If Sandbox cannot simulate settlement, label scheduled, submitted,
   pending, confirmed, and failed results as fixture-only evidence.
9. Only after Sandbox evidence is complete, configure the separate Production
   secrets and start OAuth.
10. After human authorization, perform read-only company and James-contact
    verification first. Stop before any real invoice until explicit
    authorization names the exact one-time maximum-£1 test.

No Production contact ID, token, invoice, mandate, payment, or audit record
may be copied into Sandbox, and no Sandbox identity may be assumed to exist in
Production.
