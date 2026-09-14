# Phase 7.7 - Direct Debit chain validation and reconciliation

## Status

Phase 7.7 is **implemented, validated, and deployed**. The production release
was non-financial: it applied the forward-only D1 migration and deployed the
Worker, without creating or changing any provider financial object.

The normal payment boundary remains:

```text
FoxTutor -> FreeAgent -> FreeAgent GoCardless integration -> GoCardless
```

No direct GoCardless API integration was added.

## Forensic baseline

The deployed baseline was recorded before implementation:

| Item | Observed value |
| --- | --- |
| Branch | `main` |
| Local HEAD | `e97a07e` |
| Remote branch HEAD | `b184356` |
| Phase 7.7 Worker version | `9d3d0252-57e2-4f0d-af7f-5f790923badb` |
| Last recorded deployed source | `42b021b` |
| Worker cron | `*/5 * * * *` |
| Remote D1 | `foxtutor-learn` |
| Remote D1 state after release | migrations through `0027_phase77_payment_submitted.sql` |
| Remote billing accounts | 2 |
| Remote verified FreeAgent links | 1 |

The affected diagnostic account had a verified Sandbox FreeAgent contact
mapping, but its persisted local mandate state was `UNKNOWN`. No bank details,
tokens, cookies, raw provider payloads or live payment identifiers were copied
into the repository.

The supplied real FreeAgent/GoCardless evidence was not present as a repository
artifact and could not be independently re-fetched in this execution context.
It is therefore treated as external provider-truth evidence, not as an
automated test fixture. Automated tests use synthetic identifiers only.

## Root cause of the student `UNKNOWN` state

The student billing route returned `billing_accounts.mandate_state` immediately
when an account existed. It did not perform a provider read when the stored
state was unresolved or stale. A transient provisioning/read failure could
therefore remain customer-visible as `UNKNOWN` until a later scheduled
reconciliation, with no useful distinction between stale local state and a
current provider outage.

The evidence proves a FoxTutor read-path/stale-state defect. It does **not**
prove that the underlying GoCardless mandate was absent. The original
FreeAgent Sandbox response could not be captured directly because the OAuth
material is encrypted in D1 and was not exposed to the shell.

The repair is bounded and fail-closed:

* unresolved or due states perform one documented FreeAgent contact read;
* active states are cached until the next reconciliation window;
* provider failures remain `UNKNOWN` with a safe error code;
* a returned contact must match the verified external mapping;
* missing or mismatched contacts do not silently remap the customer;
* the student page never displays provider identifiers.

## State model

### Mandate

| FreeAgent value | FoxTutor state | Customer meaning |
| --- | --- | --- |
| `setup` | `SETUP_REQUIRED` | Secure setup has not been completed |
| `pending` | `AUTHORISATION_PENDING` | The request has been sent and authorisation is pending |
| `active` | `ACTIVE` | The mandate is active |
| `inactive` | `INACTIVE` | The previous authorisation is no longer active |
| `failed` | `FAILED` | The provider or bank rejected the mandate |
| null/unexpected/provider error | `UNKNOWN` | FoxTutor cannot safely determine current state |

`UNKNOWN` is never treated as `SETUP_REQUIRED`, and an active mandate is never
treated as a secured lesson payment.

### Collection

| Provider lifecycle | Local payment state | Payment secured? |
| --- | --- | --- |
| not started | `NOT_STARTED` | No |
| scheduled | `SCHEDULED` | No |
| submitted | `SUBMITTED` | No |
| pending/processing | `PENDING` | No |
| confirmed/paid | `CONFIRMED` | Yes |
| failed | `FAILED` | No |
| missing/unexpected | `UNKNOWN` | No |

Migration `0027_phase77_payment_submitted.sql` preserves `SUBMITTED` as a
distinct state without rewriting existing payment history.

## Implementation

* `reconcileBillingAccountMandate()` performs the bounded contact refresh and
  retains safe failure classification.
* `auditBillingChain()` evaluates student, billing account, verified contact
  link, mandate, invoice, payment, and open-alert state without financial
  mutation.
* Admins can use
  `/learn/admin/billing/audit/<student-id>` for a read-only chain diagnostic.
* FreeAgent invoice parsing retains payment status and payment URL fields when
  provided.
* Invoice reconciliation maps scheduled, submitted, pending, confirmed,
  failed and unknown provider states instead of collapsing them to `SENT`.
* The sentinel now detects stale unknown mandates, stale active-mandate
  reconciliation, verified-contact mismatches, and submitted collections that
  do not progress.
* Synthetic FreeAgent and GoCardless fixture factories are labelled so they
  cannot be mistaken for production provider identifiers.

Mandate initiation remains the documented FreeAgent UI operation. FoxTutor
does not scrape FreeAgent, automate browser clicks, call private endpoints,
collect bank information, or create a second GoCardless mandate.

## Capability decision matrix

| Requirement | FreeAgent API | FreeAgent UI | Direct GoCardless API | Decision |
| --- | --- | --- | --- | --- |
| Find/create contact | Supported | Supported | Not needed | Use FreeAgent API |
| Read mandate state | Supported by contact `direct_debit_mandate_state` | Visible | Not needed | Use FreeAgent API |
| Start mandate request | Not publicly documented | Supported | Not needed | Admin starts it in FreeAgent |
| Customer authorisation | Provider-hosted workflow | Launches workflow | Not needed | Keep bank data outside FoxTutor |
| Create invoice | Supported | Supported | Not needed | Use FreeAgent API |
| Initiate invoice Direct Debit | Supported documented endpoint | Supported | Not needed | Use FreeAgent API |
| Read payment progress | Supported fields where exposed | Visible | Not needed for normal operation | Reconcile through FreeAgent |
| Confirm settlement | Supported provider/accounting state | Visible | Not needed | Only `CONFIRMED` secures payment |
| Retry safely | Local idempotency and reconciliation | Manual exception path | Not needed | Never retry an ambiguous mutation blindly |

The evidence collected does not establish a hard FreeAgent limitation that
requires direct GoCardless authority. The one unsupported automation is
mandate-request initiation; the safe solution is to keep that one operational
FreeAgent UI action explicit.

## Acceptance matrix

| Scenario | Evidence source | Expected | Result |
| --- | --- | --- | --- |
| New contact with `setup` | Synthetic FreeAgent fixture | `SETUP_REQUIRED` | Pass |
| Mandate request pending | Synthetic FreeAgent fixture | `AUTHORISATION_PENDING` | Pass |
| Active mandate | Synthetic FreeAgent fixture | `ACTIVE` | Pass |
| Inactive mandate | Synthetic FreeAgent fixture | `INACTIVE` | Pass |
| Failed mandate | Synthetic FreeAgent fixture | `FAILED` | Pass |
| Null/unexpected provider state | Synthetic fixture | `UNKNOWN` | Pass |
| Provider timeout/rate-limit/auth failure | Existing adapter contract tests | Safe classified failure | Pass |
| Wrong contact mapping | Audit fixture | `BROKEN` / action required | Pass |
| Submitted collection | Synthetic payment fixture | Not secured | Pass |
| Pending collection | Synthetic payment fixture | Not secured | Pass |
| Confirmed collection | Synthetic payment fixture/readiness | Secured | Pass |
| Full credit coverage | Local readiness logic | No collection; secured by credit | Pass |
| Local D1 migration | Wrangler local D1 | Migration `0027` applies | Pass |
| Real active provider account | External evidence supplied by user | Provider truth reference | Not independently re-fetched |
| Real invoice/payment mutation | FreeAgent Sandbox | Controlled provider acceptance | Not run in this phase |

The complete automated suite passes with 206 tests across 37 files. The local
Wrangler migration run applied migration `0027` successfully. No real-money
invoice, mandate, collection, refund, credit note or payment mutation was
performed.

## Final answers

1. **FreeAgent as the sole FoxTutor payment boundary:** Yes, based on the
   documented capabilities and the implemented reconciliation path.
2. **FreeAgent GoCardless mandate lifecycle:** Yes for reading and
   reconciliation; initiation remains the supported FreeAgent UI action.
3. **Reliable mandate reads:** Yes when the verified contact mapping is valid;
   failures remain explicit `UNKNOWN` rather than being misreported as setup.
4. **Direct Debit initiation:** Supported through the documented FreeAgent
   invoice endpoint once invoice and mandate prerequisites are met.
5. **Confirmed payment detection:** Yes for provider/accounting states exposed
   by FreeAgent; scheduled, submitted and pending are not secured.
6. **Cause of the original `UNKNOWN`:** Proven stale local read-path behavior;
   the exact historical provider response is unavailable.
7. **Code defect:** Yes.
8. **Mapping/data defect:** The mapping was verified in the observed remote
   record; mismatch handling is now fail-closed and tested.
9. **Provider/environment limitation:** Sandbox and unavailable evidence limit
   live lifecycle proof, but do not prove a need for direct GoCardless access.
10. **Synthetic fixtures:** They cover the provider states that cannot be
    safely or cheaply reproduced in Sandbox.
11. **Direct GoCardless API required:** Not established by the evidence.
12. **Was direct GoCardless added:** No.

## Production release evidence

Migration `0027_phase77_payment_submitted.sql` was applied to the remote D1 at
`2026-09-14 18:13:02` and final Worker version
`9d3d0252-57e2-4f0d-af7f-5f790923badb` was deployed after the final validation.
The existing production smoke test returned the
expected public-site responses, including a redirect for `/learn`. A remote
read-only migration query confirmed `0027` as the latest migration.

The deployment was made from the tested working tree at local baseline
`e97a07e`; the working tree changes were not represented by a new Git commit at
deployment time. The source/deployment record should therefore retain the
Worker version as the authoritative release identifier until a source commit
is created.

No deployment smoke check created an invoice, mandate, payment, credit,
refund, credit note or collection.
