# Phase 7.12 architecture

Phase 7.12 models FreeAgent Sandbox and Production as two independent
connections rather than one global accounting environment.

## Connection identities

The provider connection key is:

```text
FREEAGENT:SANDBOX
FREEAGENT:PRODUCTION
```

Each identity has its own credentials, OAuth state, encrypted access and
refresh tokens, expiry, verified company, connection status and category
mapping. Both rows may be connected simultaneously. Reauthentication replaces
only the selected environment's tokens.

The authorization and token endpoints are built from the selected connection:

```text
Sandbox    https://api.sandbox.freeagent.com/v2/approve_app
Production https://api.freeagent.com/v2/approve_app
```

The same environment binding applies to `/v2/token_endpoint`, `/v2/company`,
`/v2/categories` and token refresh. Production never falls back to generic
legacy Sandbox credential names.

## OAuth state and verification

Every initiation stores `FREEAGENT`, the selected environment, administrator,
redirect intent, expiry and a one-time state hash. The callback uses only the
validated persisted state to select the token exchange environment. Missing,
expired, consumed, wrong-provider or cross-environment state is rejected.

`CONNECTED` is written only after token exchange and a read-only company
verification match for the configured subdomain, currency and provider origin.

## Admin boundary

The accounting page renders explicit `Connect/Reauthenticate Sandbox` and
`Connect/Reauthenticate Production` actions. There is no ambiguous global
FreeAgent connect action. Category options and saved mappings are loaded and
stored independently per environment and verified company.

The payment authority remains unchanged:

```text
FreeAgent -> GoCardless -> Direct Debit
```

No direct GoCardless authority or Production financial mutation is introduced.
