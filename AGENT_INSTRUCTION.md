# Foxtutor Learn — AGENT_INSTRUCTION.md

## Purpose

This document defines how coding agents must work on the Foxtutor Learn platform.

Agents are expected to operate without conversational context. The repository itself is the source of truth.

Checkpoint sections below may retain the wording and blockers that were true at the time of an earlier pass. For current reality, use the README current-status block and the latest phase record; do not interpret superseded checkpoint text as an open blocker.

## Permanent phase numbering policy

- `.1` is the master implementation pass and must attempt the entire phase.
- `.2`, `.3` and later are remediation/cleanup passes required until the phase is actually complete.
- An agent may not declare a phase complete merely because its master pass ended.
- Completion requires documented acceptance criteria, passing test evidence, deployment evidence where applicable, a clean tree, and the required commit/tag/push record.

Phase 2 calendar chronology is authoritative: Phase 2.3 introduced calendar UX, Phase 2.4 implemented private iCalendar subscriptions, Phase 2.5 completed the initial production deployment and calendar acceptance, and Phase 2.6 completed the final remediation, documentation reconciliation and definitive Phase 2 sign-off pass. Do not describe the deployed calendar implementation as local-only. Do not reopen Phase 2 for optional calendar enhancements; only an actual regression should do so. Phase 3 is the next feature-development phase.

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
After every material implementation, verification, testing, production or cleanup pass, update `README.md` with what is now true, what remains and the current acceptance state. Do not claim phase completion prematurely.

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

## Phase 1.5 current state

On 2026-09-12 the dedicated `foxtutor-learn` credential was verified for the
Foxlearningltd account and used for Learn-only production activation. D1,
Worker deployment, exact routes and a new self-hosted Access application and
policy are live. The existing Google identity provider, Mail Access
application, EDInterval Access application and unrelated Workers remain
unchanged.

The phase is still not complete. Authenticated Chromium role/denial flows and
the controlled Fox Mail delivery/idempotency test require credentials that
were not available to the runtime. Those acceptance gates were historical Phase 1.6 blockers and were resolved by the later Phase 1.7/2.1 production work; do not treat this retained checkpoint text as the current phase state.

## Phase 1.6 current state

The Phase 1.6 acceptance pass verified the deployed Learn Worker, D1, exact
routes and existing Learn Access application without recreating any Phase 1.5
resource. The production D1 student record was safely changed from
`student.test@foxtutor.org` to `jamesanf@gmail.com`; the admin remained
`foxlearningltd@gmail.com` with `ADMIN`/`ACTIVE` status; and the Access policy
was updated to contain only those two identities.

Separate clean Chromium profiles proved the admin shell, student shell,
student-to-admin server denial, and unknown-identity denial at the final Access
perimeter. Authenticated admin inspection proved the HTML noindex metadata,
`X-Robots-Tag`, session persistence after refresh, Secure/HttpOnly/Strict
cookie attributes, and absence of authentication tokens in localStorage.

Fox Mail source and production configuration were inspected directly. Its
internal API requires the Fox Mail Worker secret `INTERNAL_API_TOKEN`, which is
absent from the current Fox Mail production secret inventory. The endpoint
also remains behind interactive Cloudflare Access, so a narrowly scoped
non-interactive Service Auth path must be configured by the system owner if
one is not already present. Learn's optional
`MAIL_API_ACCESS_CLIENT_ID` and `MAIL_API_ACCESS_CLIENT_SECRET` bindings must
only be populated with the existing Fox Mail Service Auth credentials when
Fox Mail confirms that mechanism.

`npm test`, `npm run build`, `npm run check`, `npm run test:browser` and
`npm run test:production` passed. The controlled Fox Mail delivery/idempotency
gate remained unproven in this historical Phase 1.6 checkpoint and is outside
the completed Phase 2 scope.

## Phase 2.6 current state

Phase 2.6 is complete and tagged `phase-2.6-complete`. The calendar subscription utility is intentionally collapsed by default and secondary to the calendar on both admin and student routes. Future agents must read the repository documentation before every phase and update `README.md` after every material pass. Phase 2 must not be reopened for optional calendar features; Phase 3 is next unless an actual regression is demonstrated.
