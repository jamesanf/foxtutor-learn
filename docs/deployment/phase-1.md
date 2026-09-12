# Phase 1 deployment

## Environments

| Environment | Worker access | Database | Mail |
|---|---|---|---|
| local | Wrangler dev, test identity header only | isolated local D1 binding | mock adapter unless explicitly configured |
| staging/test | separate Worker/Access policy if created | separate D1 | test mail secret and admin-only recipient |
| production | exact `foxtutor.org/learn` and `foxtutor.org/learn/*` routes behind Access | production `foxtutor-learn` D1 | Fox Mail internal API token plus any required Access Service Auth |

Never point local tests at production D1 or production mail.

## Checked-in production scope

`wrangler.jsonc` contains two explicit routes:

```text
foxtutor.org/learn
foxtutor.org/learn/*
```

The previous `foxtutor.org/learn*` prefix was intentionally removed because it could also match unrelated top-level names such as `/learn.css`. Learn assets are requested at `/learn/assets/learn.css` and `/learn/assets/learn.js`.

## Required production sequence

1. Obtain a token with account D1 edit, Workers Routes edit and Zero Trust Access edit permissions for the `foxtutor.org` account/zone.
2. Create the intended D1 database named `foxtutor-learn`, record its returned UUID, add the binding to `wrangler.jsonc`, and apply `migrations/0001_foundation.sql` remotely.
3. Provision only controlled admin/student test identities with normalized emails.
4. Configure a Google identity provider and a self-hosted Access application limited to `https://foxtutor.org/learn` and `https://foxtutor.org/learn/*`; allow only the intended test identities.
5. Configure the Fox Mail machine path: `MAIL_API_TOKEN`, `MAIL_API_FROM`, and, if the Fox Mail hostname remains Access-protected, the optional Access Service Auth secrets. Do not send to students during testing.
6. Deploy the Worker, inspect the active route, and run the authenticated browser matrix.
7. Repeat the public baseline requests and compare hashes/status/headers before creating `phase-1-complete`.

The current token was tested through Wrangler and direct REST. It can read the account, zone, Workers and Access collections and can perform Worker dry-runs, but cannot create/read remote D1, write Workers Routes, create Access applications/policies, or access R2. The exact evidence is in `docs/evidence/phase-1/cloudflare-capability-check.txt`.
