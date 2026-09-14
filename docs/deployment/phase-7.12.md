# Phase 7.12 deployment record

## Source and migration

Migration `0030_freeagent_dual_connections.sql` adds provider and redirect
intent binding to OAuth state and a per-environment billing settings table.
Apply it only after the tested Worker source is selected for deployment.

The deployment must record the source commit, Worker version, D1 migration
result and the first redirect target for each of:

```text
Connect Sandbox
Reauthenticate Sandbox
Connect Production
Reauthenticate Production
```

Expected first targets are:

```text
https://api.sandbox.freeagent.com/v2/approve_app
https://api.freeagent.com/v2/approve_app
```

## Safety boundary

Production credentials are supplied only through the deployment secret
mechanism. They are never copied from Sandbox or committed to source.
Deployment and browser acceptance remain read-only at the provider: no
Production invoice, payment, Direct Debit, credit note or bank mutation.
