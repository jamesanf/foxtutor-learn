# Phase 7.10 — FreeAgent acceptance and evidence report

## Scope

Phase 7.10 completes the remaining Sandbox/Production integration plumbing
without adding a GoCardless API integration or a second payment authority.
FreeAgent remains the accounting-document and Direct Debit authority.

The runtime selects exactly one provider trust domain with
`FREEAGENT_ENVIRONMENT=sandbox` or `FREEAGENT_ENVIRONMENT=production`.
Connections, encrypted tokens, company pins, contact mappings, invoice
configuration, invoices, payments and reconciliation records must remain in
that domain.

## Implementation evidence

- Accounting settings now use the authenticated FreeAgent `GET /v2/categories`
  operation. Administrators select a meaningful category name and nominal code;
  the provider URL is stored internally.
- Category URLs are validated against the selected API origin and the saved
  mapping is bound to the selected environment and company subdomain.
- The normal lesson accounting defaults remain £55.00, `Hours`, 0 payment
  terms days, GBP and 0% sales tax. A Sandbox acceptance invoice must use a
  separate controlled amount and must not alter lesson pricing.
- The accounting dashboard reports each mapping field separately rather than
  exposing only a generic invoice error.
- The category operation uses the existing authenticated `providerCall()` path,
  never logs tokens, and distinguishes malformed, empty and provider-error
  responses.
- Migration `0029_accounting_category_environment.sql` adds the environment
  and company binding to the existing accounting settings record. It preserves
  the current Sandbox mapping context when one exists.

## Sandbox status

The previously observed real Sandbox contact remains:

| Field | Evidence |
| --- | --- |
| Company | Fox Learning Ltd |
| Company subdomain | `foxlearningltdgmailcom` |
| Contact reference | `257175` |
| Contact response | HTTP 200 |
| `direct_debit_mandate_state` | Absent |
| Normalized mandate state | `UNKNOWN` |
| Diagnostic | `MANDATE_STATE_MISSING` |
| Financial mutation | None |

No Sandbox category list or invoice is claimed until the new release is
deployed and an administrator explicitly selects the approved company
category. No Sandbox invoice, replay, Direct Debit initiation, credit, refund,
or payment mutation has been performed in this phase at the time of writing.

## Direct Debit setup boundary

FoxTutor does not collect bank details, create a GoCardless mandate, or
generate a provider mandate invitation. The available FoxTutor notification is
an instructional/support email:

- setup subject: `Direct Debit setup required`;
- pending subject: `Direct Debit authorisation pending`;
- recipient: the mapped student's Learn email address;
- sender: the configured FoxTutor mail service;
- content: tells the recipient that setup/authorisation occurs through the
  secure provider flow and that bank details must not be sent to FoxTutor;
- provider URL: none;
- provider invitation: not present.

Provisioning records a safe setup/reminder dispatch outcome in
`billing_provisioning_events` with idempotent notification delivery. The
truthful capability classification is:

```text
NO — FreeAgent/provider-hosted setup is required
```

The student UI must not show a fake FoxTutor mandate button. It may describe
the provider-hosted setup requirement and show the current read-only state.

## Production status and human boundary

Production uses distinct secret names:

- `FREEAGENT_PRODUCTION_CLIENT_ID`
- `FREEAGENT_PRODUCTION_CLIENT_SECRET`
- `FREEAGENT_PRODUCTION_COMPANY_SUBDOMAIN`
- `FREEAGENT_PRODUCTION_TOKEN_ENCRYPTION_KEY`
- `FREEAGENT_PRODUCTION_OAUTH_REDIRECT_URI`

The existing generic names remain compatibility fallbacks for Sandbox only.
Production OAuth state is environment-bound and cannot overwrite the Sandbox
connection. Production contact lookup, company verification, category
selection, mandate confirmation and the real James mapping remain pending until
the user completes the Production OAuth authorization.

After authorization, the safe order is read-only company/contact verification,
mandate reconciliation, explicit Production category selection, and an
authorization gate before any financial mutation. No Production contact,
invoice, payment, mandate, or £1 collection is claimed here.

## £1 status

```text
Not prepared — Production OAuth and explicit accounting mapping are pending.
```

The intended test remains one controlled £1 invoice/Direct Debit operation
only after the company, contact and active mandate are independently verified
and the user explicitly authorizes the financial effect. Pending or submitted
provider state is not treated as secured payment, and no automatic refund or
credit note is performed.

## Deployment provenance

The Phase 7.10 release was committed before deployment:

- source commit: `ce85e6f3d89a6eeddb0e99b94a643af6e04ae5f8`;
- Worker version and creation time: recorded in the final Phase 7.10 release
  report after deployment;
- remote migration: `0029_accounting_category_environment.sql` applied;
- post-deploy migration check: no migrations to apply;
- smoke test: `/learn` returned the expected Cloudflare Access `302`;
- repository: clean after deployment.

The prior Phase 7.9 commit `7862e3bee6abc6458293d959990f6d8b6e48fab0` was
created after an earlier Worker deployment and is not attributed to Worker
`b523fd96-9f3b-4599-ae0d-8687550121c0`. The later contact-table Worker
`d106164d-adbf-411f-b3bb-9e48413d1410` also predates this release.

## Readiness

```text
NOT READY — ACCOUNTING MAPPING REQUIRES EXPLICIT SELECTION
```

Production also remains blocked by the unavoidable human FreeAgent OAuth
authorization boundary.
