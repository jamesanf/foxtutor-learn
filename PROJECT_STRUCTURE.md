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
│   ├── domain/
│   ├── security/
│   ├── mail/
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
│   ├── architecture/
│   ├── security/
│   ├── deployment/
│   ├── api/
│   ├── testing/
│   ├── evidence/
│   └── handover/
└── agent-work/
    └── task-log.md
```

## Directory rules

- `src/` contains application source only.
- `public/` contains deployable browser assets, not secrets.
- Learn browser assets are served at `/learn/assets/*`; top-level public-site paths are not Learn routes.
- `migrations/` is forward-only D1 migration history.
- `tests/` contains automated checks.
- `docs/` contains project operating documentation.
- `scripts/` contains deterministic project helpers and verification tools.
- `agent-work/` contains task-oriented project records, not credentials or production data.
- Authenticated browser profiles, cookies, access tokens, test downloads, local R2 exports, and other sensitive runtime state must never be committed.
- `foxtutorpublic/` is a local read-only branding/reference export and is ignored; the public-site repository is never a submodule or deployment input.
