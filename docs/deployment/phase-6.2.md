# Phase 6.2 — Deployment and human handover

## Starting state

- Branch: `main`
- Starting commit and remote: `7756dc79e2989098fe497783e1b73076b0d1238e`
- Current Phase 6.1 Worker: `5f07214e-bb8f-4f69-8826-5ae34ef199c0`
- Remote D1: `foxtutor-learn`; migration `0016_accounting_outbox.sql` applied
- Current Worker secret inventory contains no FreeAgent client, encryption-key
  or OAuth redirect configuration.
- No FreeAgent connection or accounting contact mapping exists.

## Safe release boundary

The Phase 6.2 hardening changes can be deployed without provider credentials.
They add forward-only metadata/audit schema and fail closed when FreeAgent is
not configured. No financial mutation is enabled by this release alone.

The rollout order is:

1. Commit and push the reviewed hardening change.
2. Apply `0017_accounting_operations.sql` to the production D1.
3. Deploy the exact pushed commit.
4. Verify the Worker, migration state and admin route authorization.
5. Stop for the human commercial and FreeAgent configuration handover below.

## Release record

- Source commit: `c515b6b`
- Remote `main`: `c515b6b`
- Production Worker: `1386d7d5-3c7a-42bf-89a2-965c0db2c8c1`
- Production D1: `0017_accounting_operations.sql` applied; no migrations
  pending
- FreeAgent secrets, OAuth connection, contact mappings and invoice mapping
  remain absent

## Human handover — required before Phase 6 closure

The system owner must provide and approve, outside source control:

- the commercial treatment of `ADMIN_CANCELLED`;
- amount, gross/net, rounding, currency and tax/VAT policy;
- payer/contact authority and invoice item/category mapping;
- accounting-effective-date policy;
- FreeAgent sandbox client ID and secret;
- environment-specific token-encryption key;
- exact OAuth callback URI;
- intended sandbox company subdomain;
- approved sandbox contact mapping fixture.

Configure those values through the supported Worker secret/configuration
mechanism. Never place credentials, tokens or raw provider payloads in D1
fixtures, logs, screenshots or documentation.

After sandbox evidence is complete, repeat the configuration with the
production company and run exactly one approved controlled accounting event.
Independently verify the provider-side object, retain only the safe external
reference/evidence, clean up only the approved fixture data, and create
`phase-6-complete` only after every Phase 6.2 acceptance item passes.

## Current decision

Because the commercial policy and provider credentials are unavailable,
Phase 6 remains open. This is an intentional safety stop, not a deployment
failure.
