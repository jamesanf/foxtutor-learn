# Phase 7.12 handover

## Delivered

- Independent Sandbox and Production FreeAgent connection records.
- Explicit environment-labelled admin connection actions.
- Environment-bound OAuth state, token exchange, refresh and encryption keys.
- Read-only company verification before a connection becomes `CONNECTED`.
- Independent category settings and exact provider-origin validation.
- Production prohibition on legacy generic Sandbox credentials.

## Required human actions

1. Verify the first OAuth redirect for each explicit Sandbox and Production
   action.
2. Use legitimate Production FreeAgent application credentials and authorize
   the intended company through `Connect Production`.
3. Record only read-only company, contact/mandate and category evidence.

The release is **NOT READY — PRODUCTION FREEAGENT AUTHORIZATION REQUIRED**.
Do not create invoices, payments, Direct Debits, credit notes or perform the
£1 test in this phase.
