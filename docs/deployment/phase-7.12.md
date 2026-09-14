# Phase 7.12 deployment record

## Source and migration

Migration `0030_freeagent_dual_connections.sql` adds provider and redirect
intent binding to OAuth state and a per-environment billing settings table.
It was applied successfully to the production D1 database before the Worker
deployment.

| Item | Value |
| --- | --- |
| Source commit | `7ef5c76` |
| Worker version | `46e84b42-6201-4141-ad7e-f567ddd45b80` |
| D1 migration | `0030_freeagent_dual_connections.sql` applied |
| Follow-up migration check | No migrations to apply |
| Production smoke | `/learn` returned Cloudflare Access `302` |

Authenticated browser verification must record the first redirect target for
each of:

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

The temporary compatibility test may provision the existing Sandbox app's
Client ID and Secret under the two Production credential secret names only.
Secret values must never be copied into source, logs or documentation. After
the test, retain the result and remove or replace the temporary Production
credential configuration as appropriate.

## Safety boundary

Production credentials are supplied only through the deployment secret
mechanism. They are never copied from Sandbox or committed to source.
Deployment and browser acceptance remain read-only at the provider: no
Production invoice, payment, Direct Debit, credit note or bank mutation.
