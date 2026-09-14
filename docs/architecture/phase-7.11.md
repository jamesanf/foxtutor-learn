# Phase 7.11 architecture (historical)

> Phase 7.13 supersedes the single runtime-selector model documented here.
> Current architecture is recorded in `docs/architecture/phase-7.13.md`.

Phase 7.11 preserves the Phase 7 accounting authority boundary and repairs
two provider integration contracts: FreeAgent category response normalization
and environment-specific OAuth routing.

## Authoritative environment

`FREEAGENT_ENVIRONMENT` is the single runtime selector and may be only
`sandbox` or `production`. It selects the API origin, authorization endpoint,
token endpoint, credential set, encryption key, expected company subdomain,
connection records and category validation origin.

```text
sandbox    -> https://api.sandbox.freeagent.com
production -> https://api.freeagent.com
```

Both environments use `/v2/approve_app` and `/v2/token_endpoint` on their own
origin. Production never falls back to the legacy generic Sandbox credential
names.

## OAuth state boundary

The OAuth state record binds provider, environment, initiating administrator,
expiry, redirect intent and one-time consumption. Callback processing verifies
the stored provider and environment before token exchange or persistence.
Invalid, expired, consumed, missing or cross-environment callbacks fail
closed. A successful connection writes only the selected environment's
connection and leaves the other environment untouched.

Company verification is part of connection establishment: token exchange
alone cannot produce `CONNECTED`. The configured company subdomain and
expected currency must match the read-only company response.

## Category provider contract

FreeAgent `/v2/categories` returns four collections:

```text
admin_expenses_categories
cost_of_sales_categories
income_categories
general_categories
```

The adapter maps provider `description`, `nominal_code`, `url` and optional
`auto_sales_tax_rate` into the application model with an explicit group.
Missing collection keys are treated as empty; present null collections,
malformed items, missing URL/description and wrong-origin URLs are rejected.
Provider URLs are the stable deduplication key. The UI receives readable
descriptions, nominal codes and group labels, never a provider URL as the
primary label.

This normalization is company/environment-bound: options are loaded from the
connected FreeAgent company and saved mappings retain environment and company
identity.

## Payment authority

The architecture remains:

```text
FreeAgent -> GoCardless -> Direct Debit
```

FoxTutor does not call the GoCardless API directly, store a parallel mandate,
collect bank details or create financial objects in this phase.
