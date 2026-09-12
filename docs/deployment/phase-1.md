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

1. Use the existing `foxtutor build token` through `CLOUDFLARE_API_TOKEN` for the complete production control plane. Before any production mutation, verify Access application, identity-provider and policy write authorization with invalid-payload probes. Do not substitute the existing Wrangler OAuth session: it can authorize some Worker, D1 and Workers Routes operations but cannot complete the Access perimeter.
2. Create the intended D1 database named `foxtutor-learn`, record its returned UUID, add the binding to `wrangler.jsonc`, and apply `migrations/0001_foundation.sql` remotely.
3. Provision only controlled admin/student test identities with normalized emails.
4. Configure a Google identity provider and a self-hosted Access application limited to `https://foxtutor.org/learn` and `https://foxtutor.org/learn/*`; allow only the intended test identities.
5. Configure the Fox Mail machine path: `MAIL_API_TOKEN`, `MAIL_API_FROM`, and, if the Fox Mail hostname remains Access-protected, the optional Access Service Auth secrets. Do not send to students during testing.
6. Deploy the Worker, inspect the active route, and run the authenticated browser matrix.
7. Repeat the public baseline requests and compare hashes/status/headers before creating `phase-1-complete`.

Phase 1.3 tested both the environment API token and the existing Wrangler OAuth session through Wrangler and direct Cloudflare REST. The OAuth session can read and provisionally authorize Worker, D1 and Workers Routes operations, and can read R2; the environment token cannot. The Phase 1.4 preflight confirmed that the intended replacement credential is still not exposed: neither currently available mechanism can write Zero Trust Access applications or identity providers. The account inventory and exact sanitized results are in `docs/evidence/phase-1/cloudflare-capability-check.txt` and `docs/evidence/phase-1/phase-1.4-credential-check.txt`.
