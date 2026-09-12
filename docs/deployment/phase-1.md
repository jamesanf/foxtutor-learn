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

1. Use the dedicated `foxtutor-learn` credential through `CLOUDFLARE_API_TOKEN` for the complete production control plane. Before any production mutation, verify the account, D1, Worker, Routes and Access capabilities. Do not substitute an unrelated Wrangler OAuth session.
2. Create the intended D1 database named `foxtutor-learn`, record its returned UUID, add the binding to `wrangler.jsonc`, and apply `migrations/0001_foundation.sql` remotely.
3. Provision only controlled admin/student test identities with normalized emails.
4. Configure a Google identity provider and a self-hosted Access application limited to `https://foxtutor.org/learn` and `https://foxtutor.org/learn/*`; allow only the intended test identities.
5. Configure the Fox Mail machine path: `MAIL_API_TOKEN`, `MAIL_API_FROM`, and, if the Fox Mail hostname remains Access-protected, the optional Access Service Auth secrets. Do not send to students during testing.
6. Deploy the Worker, inspect the active route, and run the authenticated browser matrix.
7. Repeat the public baseline requests and compare hashes/status/headers before creating `phase-1-complete`.

The 2026-09-12 Phase 1.5 activation used the dedicated Learn credential. It created D1 `foxtutor-learn` (`204dadc5-46ff-41b7-9da1-049f85d29422`), applied `0001_foundation.sql`, created the isolated Access app/policy, deployed Worker `foxtutor-learn` version `24b3ab69-ed6c-4721-aad3-8eda0a99fba7`, and installed only the two configured Learn routes. See `docs/evidence/phase-1/phase-1.5-production-activation.txt`.

## Phase 1.6 acceptance state

The deployed resources were left in place. The production D1 student row was
updated with a guarded statement from `student.test@foxtutor.org` to
`jamesanf@gmail.com`; no duplicate or additional active user was created.
The Learn Access policy still requires the same identity replacement because
the currently exposed environment token is not authorized for Access writes.

Fox Mail's authoritative contract requires its `INTERNAL_API_TOKEN` bearer
secret and a non-interactive Cloudflare Access path for
`/internal/api/v1/messages/send`. Fox Mail's current production secret list
does not contain `INTERNAL_API_TOKEN`, and a request without Service Auth is
redirected to interactive Access. Do not invent or copy a token. See
`docs/handover/phase-1.md` for the exact human steps.
