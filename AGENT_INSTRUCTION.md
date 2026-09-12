# Foxtutor Learn — AGENT_INSTRUCTION.md

## Purpose

This document defines how coding agents must work on the Foxtutor Learn platform.

Agents are expected to operate without conversational context. The repository itself is the source of truth.

## Permanent phase numbering policy

- `.1` is the master implementation pass and must attempt the entire phase.
- `.2`, `.3` and later are remediation/cleanup passes required until the phase is actually complete.
- An agent may not declare a phase complete merely because its master pass ended.
- Completion requires documented acceptance criteria, passing test evidence, deployment evidence where applicable, a clean tree, and the required commit/tag/push record.

## Mandatory first action

Before modifying anything, read in this order:

1. `README.md`
2. `AGENT_INSTRUCTION.md`
3. `CHANGELOG.md`
4. the current phase document in `docs/phases/`
5. relevant architecture/security/data-model documents
6. current git status and recent commit history

Do not start coding until the current state is understood.

## Available resources

Agents may be provided with the following capabilities. The task prompt will state which are available in the current environment:

- Git repository and git push/commit/tag access.
- Cloudflare/Wrangler CLI and configured Cloudflare account access.
- Cloudflare Worker/D1/R2/Access configuration access where permissions allow.
- `mail.foxtutor.org` API access where credentials and endpoint contract are provided.
- Chromium CLI/browser automation for authenticated and regression testing where required.
- Node/npm package management.
- Local test environment.
- Deployment credentials appropriate to the phase.

Never assume an unavailable credential or service exists. Record the limitation.

## Operating principles

### 1. Minimise moving parts

Prefer the simplest implementation that satisfies the requirement.

Do not introduce:

- new services without an explicit need;
- unnecessary queues;
- microservices;
- new databases when D1 is sufficient;
- a second email provider abstraction when the mail API already provides one;
- application-level password management when Cloudflare/Google identity is the chosen V1 mechanism;
- general-purpose file-drive functionality;
- complex client state management when ordinary React state/server queries are sufficient.

### 2. Protect data by default

Assume all student data is confidential.

Every data read and mutation must be authorization-scoped.

Do not rely on UI hiding alone.

Do not expose:

- cookies;
- session tokens;
- OAuth refresh tokens;
- API keys;
- Cloudflare credentials;
- FreeAgent credentials;
- mail API credentials;
- raw R2 bucket URLs;
- private student data in logs.

### 3. Do not make private content indexable

The Learn application is private.

Changes must preserve:

- Cloudflare Access protection;
- application authorization;
- private response headers;
- noindex metadata;
- sitemap exclusion;
- absence of unintended public links.

Any task touching routing, deployment, public assets or HTML must test the private/indexing boundary.

### 4. Preserve authoritative systems

- Gmail/Brevo authority remains behind `mail.foxtutor.org`.
- FreeAgent remains the accounting authority.
- GoCardless remains downstream of the accounting/payment configuration.
- R2 stores documents; D1 stores metadata.

Do not create second authoritative copies of external systems without explicit approval.

### 5. Prefer idempotent operations

Any operation that sends an email, processes a document, creates an external accounting action, or mutates an important workflow must have a safe retry story.

## Documentation discipline

Documentation is part of implementation, not a final administrative task.

Every task must update relevant documentation in the same change.

### README must contain

- one-paragraph project brief;
- current production state;
- current phase;
- phase map;
- repository map;
- environment map;
- test commands;
- deployment commands;
- key architectural decisions;
- links to detailed documents;
- current known limitations;
- latest changelog summary.

### CHANGELOG.md must contain

A chronological, human-readable account of every completed pass.

Each entry should state:

- date;
- phase;
- task/agent identifier;
- intent;
- implementation;
- tests run;
- deployment result;
- notable decisions;
- known limitations;
- handover requirement, if any.

Do not replace old entries. Append a new entry.

### Architecture/decision documents

Update the relevant document when a design decision changes.

Use `docs/decisions.md` for important choices that do not belong in a more specific document.

## Task execution protocol

For every assigned task:

### Step 1 — Establish state

Run:

- `git status`
- relevant test/build/check commands
- repository inspection as needed

Record unexpected state before modifying it.

### Step 2 — Understand the request

Translate the task into:

- desired behaviour;
- affected components;
- security implications;
- data implications;
- test requirements;
- documentation requirements.

Do not broaden scope without recording why.

### Step 3 — Implement the smallest coherent change

Prefer small, reversible changes.

Avoid speculative abstractions.

### Step 4 — Test progressively

Run the narrowest relevant test first, then broader suites.

At minimum, perform:

- type-check/build where relevant;
- unit tests;
- integration tests for changed boundaries;
- browser/regression test where UI behaviour changes;
- security/privacy test where authentication/authorization/routing changes;
- deployment smoke test when deployment is available.

### Step 5 — Inspect the diff

Review:

- `git diff --check`
- changed files;
- generated files;
- accidental secrets;
- unnecessary dependencies;
- documentation accuracy.

### Step 6 — Update documentation

Before committing:

- update README current-state/map if required;
- update relevant docs;
- append CHANGELOG entry;
- record test evidence;
- record deployment evidence.

### Step 7 — Label, commit, push, deploy

Every agent task prompt must end with the following operational requirement, adapted to the current phase/environment:

> **Finalise the task by creating the required git label/tag, committing the completed changes with a clear message, pushing the branch/commit to the configured remote, and deploying the current application to the appropriate environment. If production deployment is not yet authorised because the project is pre-live, perform the available local/preview deployment verification and document that production deployment remains blocked until the live gate.**

Agents must not silently stop after local testing.

## Human handover protocol

If a task requires human intervention, do as much as possible first.

Examples:

- human must approve a Google OAuth configuration;
- Cloudflare dashboard setting requires manual confirmation;
- DNS change requires human control;
- external provider verification cannot be automated;
- production secret must be entered manually;
- destructive production action requires explicit confirmation.

The agent must:

1. finish all code/documentation/tests that can be completed safely;
2. update README and relevant documentation;
3. append a changelog entry;
4. commit completed work;
5. push the commit;
6. create the appropriate label/tag if the task is otherwise complete;
7. stop before the unsafe/manual action;
8. print exact human instructions;
9. state the verification command or test to run after the human action;
10. state what the next agent should inspect before continuing.

Never leave undocumented half-complete work.

## Test evidence standard

Do not say "tests passed" without stating what ran.

Prefer:

```text
npm test
npm run check
npm run build
npm run verify:browser
npx wrangler deploy --dry-run
```

Use the actual project commands documented in README, not invented commands.

For production smoke tests record:

- URL;
- time/date;
- authentication state;
- expected result;
- actual result.

## Database and migration rules

- Migrations must be forward-only and committed.
- Never edit an already-applied production migration in place.
- Test migrations from a clean database and from the latest known schema.
- Document destructive migrations explicitly.
- Maintain data-retention and deletion semantics alongside schema changes.

## R2/document rules

- R2 objects are private.
- D1 stores metadata, not file bodies.
- Object keys must be stable and opaque.
- Do not use student names in object keys.
- File access requires application authorization.
- Uploads must enforce type and size policy.
- PDF processing must not turn the Worker into an uncontrolled CPU-heavy endpoint.
- Processing states must be explicit.
- Temporary objects must have a cleanup path.

## Email rules

- Use `mail.foxtutor.org` API rather than embedding Gmail/Brevo provider logic in Learn.
- Notifications must be idempotent.
- Do not log message bodies or credentials.
- Treat uncertain mail delivery as a visible state rather than silently sending duplicates.

## FreeAgent rules

- Never infer or invent FreeAgent API behaviour from MyTutor.
- Keep accounting actions behind a small adapter.
- Use outbox/idempotency semantics.
- Store external references and failure states.
- Do not store bank credentials or implement direct debit management in Learn unless explicitly scoped in a future phase.

## Security rule: do not weaken the perimeter to make testing convenient

Agents may create local test-only configuration, fixtures, or mock identity providers.

They must not:

- remove Cloudflare Access from production;
- make R2 public;
- allow unauthenticated student endpoints;
- expose test accounts publicly;
- disable authorization checks in production;
- add debug endpoints to live deployments.

## Browser testing

Where Chromium is available, use it for meaningful end-to-end flows.

At minimum, exercise both roles for changed functionality:

- admin flow;
- student flow;
- unauthorized flow where applicable.

Capture screenshots or logs when they materially help diagnosis, but do not retain unnecessary personal data.

## When uncertain

Prefer:

1. the README;
2. current architecture documents;
3. existing tests;
4. current code;
5. explicit task wording;
6. the smallest safe implementation.

Do not silently invent requirements.

## Agent completion record

Every completed task should leave a concise record containing:

- task ID;
- summary;
- files changed;
- tests run;
- deployment environment/result;
- documentation updated;
- git commit;
- git label/tag;
- known limitations;
- human handover, if any.

For Phase 1.1, production must not be marked complete while Cloudflare Access, D1, routing or post-deployment public-site regression evidence is missing.

## Phase 1.2 current state

The Phase 1.2 remediation pass must preserve the public site and may only mark Phase 1 complete after remote D1, the exact `/learn` route, Cloudflare Access/Google policy, authenticated browser tests, production noindex checks, mail boundary verification and public regression evidence exist. The 2026-09-12 pass completed the local D1/Worker proof and code/documentation remediation, but remains blocked by documented Cloudflare control-plane permissions. See `docs/evidence/phase-1/cloudflare-capability-check.txt` and `docs/handover/phase-1.md`.

## Phase 1.3 current state

The 2026-09-12 capability reconciliation discovered a second existing authentication mechanism: the local Wrangler OAuth session at `~/Library/Preferences/.wrangler/config/default.toml`. With `CLOUDFLARE_API_TOKEN` unset, `npx wrangler whoami` reports the Foxlearningltd account and relevant `workers_scripts:write`, `workers_routes:write` and `d1:write` scopes. Direct OAuth-backed API probes confirmed D1 and route reads, non-mutating Worker/D1/route write validation, and R2 reads. The environment token remains insufficient for those operations.

The OAuth session is not authorized to write Zero Trust Access applications or identity providers (`HTTP 403`, `auth.forbidden`, error `1010`), and Access collections are empty. No production state was changed. Phase 1 remains incomplete and has a genuine human blocker: make an existing Access-write-capable Cloudflare credential available to the runtime, or create the minimum credential only if no such existing credential exists. See `docs/evidence/phase-1/cloudflare-capability-check.txt` and `docs/handover/phase-1.md`.

## Phase 1.4 current state

The 2026-09-12 production activation preflight rechecked the configured runtime rather than assuming the credential handover had taken effect. `CLOUDFLARE_API_TOKEN` is still the previously blocked API-token credential, not the stated Access-write-capable `foxtutor build token`. Account, zone, Worker and Access collection reads pass, while D1, Workers Routes, R2 and Worker deployment operations remain authentication-blocked. Invalid-payload writes to Access applications, identity providers and policies remain forbidden (`HTTP 403`, `auth.forbidden`, error `1010`).

The existing Wrangler OAuth session remains available for Worker, D1 and Workers Routes operations, but it does not authorize Access writes. No production mutation is safe until the intended existing credential is exposed through the configured runtime path. The public site remains unchanged; `/learn` is still the known public-site fall-through and `npm run test:production` correctly fails the private-route assertion. See `docs/evidence/phase-1/phase-1.4-credential-check.txt`.

The latest local hardening pass makes malformed percent-encoded cookie values fail closed instead of throwing before authorization. The change is covered by the unit suite; production activation remains blocked independently by the missing Access write capability.
