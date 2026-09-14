# Phase 7.13 architecture

Phase 7.13 completes the post-authorization path for the independent
`FREEAGENT:SANDBOX` and `FREEAGENT:PRODUCTION` connections established in
Phase 7.12.

## Callback pipeline

```text
hashed state lookup and atomic consumption
→ administrator and redirect-intent validation
→ environment-specific token exchange
→ read-only /v2/company request
→ provider-origin, currency and company identity verification
→ environment-specific token encryption and connection upsert
→ category-policy resolution
→ accounting redirect
```

The callback uses the environment stored in OAuth state rather than a runtime
default. Production exchanges through `https://api.freeagent.com`; Sandbox
exchanges through `https://api.sandbox.freeagent.com`. A successful exchange
alone never produces `CONNECTED`.

## Connection state

Successful persistence writes the selected environment's company identity,
encrypted token material, expiry and `last_success_at`, clears stale error
fields and sets `CONNECTED`. A callback failure is classified by stage and
marks an existing selected-environment connection `ATTENTION`. Sandbox rows,
tokens, company data and category mappings are never overwritten by a
Production callback.

During the temporary compatibility period, Production may discover its company
subdomain from `/v2/company` because no permanent Production pin has been
chosen. The discovered subdomain must still be non-empty, the provider origin
must be Production and the currency must match the accounting contract.

## Fixed category policy

FoxTutor has one logical sales-revenue policy. The approved Sandbox category
is the reference only; its provider URL is not portable. Production categories
are matched by category group, normalized description and nominal code.

- Exactly one match is stored as the environment-specific mapping.
- Multiple matches remain an explicit accounting exception.
- No match remains an explicit accounting exception.

Normal operation displays the configured category identity rather than the
provider's unrestricted category catalogue.

## Safety boundary

Diagnostics record only safe metadata such as stage, environment, endpoint
host, HTTP status, response shape and company identity fields. Tokens,
refresh tokens, authorization codes, client secrets and OAuth state values are
never recorded. No Production financial mutation is part of this phase.
