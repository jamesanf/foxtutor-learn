# Phase 6.3 - Commercial approval and external acceptance preflight

## Status

Phase 6.3 is **blocked at the external commercial and provider-configuration
gate**. No commercial accounting contract was inferred, no FreeAgent
credentials were configured, no OAuth connection exists, and no financial
mutation was attempted.

The existing Phase 6.1 and Phase 6.2 architecture remains the boundary. The
preflight did not redesign or refactor the accounting implementation.

## Starting state

- Repository: `jamesanf/foxtutor-learn`
- Branch: `main`
- Repository commit: `cef0591`
- `origin/main`: `cef0591`
- Phase 6.2 implementation commit: `b5a213f`
- Working tree: clean before this documentation-only preflight
- Completion tag: no `phase-6-complete` tag exists
- Production Worker: `foxtutor-learn`
- Production Worker version: `26463610-92d2-490a-8e0f-c067cf45b846`
- Deployed source release: `b5a213f` (`Add safe accounting mapping removal`)
- Production D1: `foxtutor-learn`
  (`204dadc5-46ff-41b7-9da1-049f85d29422`)
- Production migrations: through `0017_accounting_operations.sql`
- Pending production migrations: none
- Production R2: `foxtutor-learn-resources`
- Scheduled processing: every five minutes
- Production routes: `foxtutor.org/learn` and `foxtutor.org/learn/*`

The remote accounting tables exist, but the production D1 contains zero
accounting outbox rows, zero FreeAgent connection rows, zero contact mappings
and zero retry-audit rows. The production secret inventory contains no
`FREEAGENT_*` secrets.

## Commercial gate

The following values remain explicitly unapproved:

- `ADMIN_CANCELLED` accounting treatment;
- amount source, gross/net semantics, rounding and currency;
- payer/contact authority;
- invoice item/category;
- VAT/tax treatment;
- accounting-effective-date rule.

Therefore the implementation must continue to fail closed for invoice-producing
events. No machine-readable production accounting contract is created by this
preflight.

## Provider documentation check

Official FreeAgent documentation was rechecked on 2026-09-13:

- [API overview](https://dev.freeagent.com/docs)
- [OAuth 2.0](https://dev.freeagent.com/docs/oauth)
- [Company](https://dev.freeagent.com/docs/company)
- [Contacts](https://dev.freeagent.com/docs/contacts)
- [Invoices](https://dev.freeagent.com/docs/invoices)
- [Sales Tax and VAT](https://dev.freeagent.com/docs/sales_tax)
- [Currencies](https://dev.freeagent.com/docs/currencies)

The documentation confirms the sandbox authority, OAuth approval and token
endpoints, one-hour access-token lifetime, refresh-token flow, company
subdomain/currency identity, contact URL references, invoice date and payment
terms fields, ISO currency codes, and explicit invoice-item sales-tax fields.
The existing adapter remains unactivated because the commercial mapping,
including tax, is not approved. Sandbox acceptance must verify the exact
registered application access level and any configured invoice payload fields
before production configuration.

## Decision

Preserve the current implementation and stop before credentials, OAuth,
contact mapping, invoice mapping or provider mutation. Continue only after the
system owner supplies the commercial approval and environment-specific
credentials through the approved secret-management path.
