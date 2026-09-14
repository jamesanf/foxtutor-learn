# Foxtutor Learn Repository Structure

This is the current canonical structure. Agents may refine it when implementation evidence requires a change, but must document structural changes.

```text
/
├── README.md
├── AGENT_INSTRUCTION.md
├── CHANGELOG.md
├── PHASE_PLAN.md
├── PROJECT_STRUCTURE.md
├── package.json
├── tsconfig.json
├── wrangler.jsonc
├── wrangler.local.jsonc
├── src/
│   ├── worker/
│   │   ├── index.ts
│   │   ├── routes/
│   │   └── middleware/
│   ├── auth/
│   ├── db/
│   │   ├── accounting.ts
│   │   └── cancellations.ts
│   ├── accounting/
│   │   ├── credentials.ts
│   │   ├── service.ts
│   │   └── freeagent/
│   │       └── client.ts
│   ├── domain/
│   │   └── cancellations.ts
│   ├── security/
│   ├── mail/
│   ├── notifications/
│   ├── reports/
│   └── client/
├── public/
│   ├── learn.css
│   └── learn.js
├── migrations/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── security/
│   ├── browser/
│   └── fixtures/
├── scripts/
├── docs/
│   ├── phase-6.md
│   ├── architecture/
│   ├── security/
│   ├── deployment/
│   ├── api/
│   ├── testing/
│   ├── evidence/
│   └── handover/
```

## Directory rules

- `src/` contains application source only.
- `public/` contains deployable browser assets, not secrets.
- Learn browser assets are served at `/learn/assets/*`; top-level public-site paths are not Learn routes.
- `migrations/` is forward-only D1 migration history.
- The current accounting schema ends at `0020_accounting_company_name.sql`;
  applied migrations must never be edited in place.
- `tests/` contains automated checks.
- `docs/` contains project operating documentation.
- Current Phase 6 records are consolidated in `docs/phase-6.md`,
  `docs/architecture/phase-6.md`, `docs/security/phase-6.md`,
  `docs/testing/phase-6.md`, `docs/deployment/phase-6.md` and
  `docs/handover/phase-6.md`; historical chronology is retained in
  `CHANGELOG.md`.
- `scripts/` contains deterministic project helpers and verification tools.
- Session task records are kept outside the repository; credentials and production data never belong in project files.
- Authenticated browser profiles, cookies, access tokens, test downloads, local R2 exports, and other sensitive runtime state must never be committed.
- `foxtutorpublic/` is a local read-only branding/reference export and is ignored; the public-site repository is never a submodule or deployment input.
