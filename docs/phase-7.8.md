# Phase 7.8 - FreeAgent billing acceptance and finalisation

## Status

Phase 7.8 is **NOT READY - PROVIDER ACCEPTANCE REMAINS**. The local
implementation and regression suite are passing, the production mapping has
been identified read-only, and the code now records why a verified contact
still resolves to an unknown mandate state. The real FreeAgent contact API
response and an authenticated post-deployment student reload still require
human-assisted acceptance.

No direct GoCardless API integration was added. FreeAgent remains the
accounting and payment authority, and FoxTutor does not collect bank details or
create a parallel mandate.

## Exact production mapping

The following read-only D1 observations were made on 2026-09-14:

| Field | Observed value |
| --- | --- |
| FoxTutor student ID | `2dba78cd-0ce9-4aa2-918f-c3fb9d3b683b` |
| Student email | `jamesanf@gmail.com` |
| Student status | `ACTIVE` |
| Billing account ID | `billing-account:2dba78cd-0ce9-4aa2-918f-c3fb9d3b683b` |
| Payment method | `DIRECT_DEBIT` |
| External accounting link ID | `8a7e7b0c-0071-4152-961c-6518e65518a1` |
| Provider / resource | `FREEAGENT` / `CONTACT` |
| FreeAgent environment | `sandbox` |
| FreeAgent company | `Fox Learning Ltd` / `foxlearningltdgmailcom` |
| FreeAgent contact ID | `257175` |
| External link status | `VERIFIED` |
| Billing account mandate state | `UNKNOWN` |
| Billing account provisioning state | `UNKNOWN` |
| Last reconciliation | `2026-09-14T18:39:49.342Z` |
| Last error code | none persisted before this release |
| Current provider payment records | none |

The mapping is deterministic and does not rely on email-based substitution.
The inactive isolation fixture has no verified link and was not used for
acceptance.

The user supplied the fact that this FreeAgent contact has an active Direct
Debit in the real FreeAgent UI. That UI observation was not independently
captured by this execution environment. The exact raw contact API response was
also not retained by the previous release, so this report does **not** claim
that the API exposed `active`.

## Why the student page said “Direct Debit status unavailable”

The page was correctly rendering FoxTutor's fail-closed `UNKNOWN` state. The
production record showed a verified contact mapping and a recent reconciliation
with no transport error, but the exact provider mandate field was not retained
for diagnosis. Therefore the repository evidence can rule out a missing
FoxTutor link and can rule out a stored authentication/network error, but it
cannot yet distinguish:

* FreeAgent returning a null mandate field;
* FreeAgent returning an unrecognised mandate value; or
* a provider response shape that the previous parser did not preserve.

The 7.7 stale-read defect remains fixed: unresolved state triggers a bounded
contact read. Phase 7.8 now classifies and persists the next observed result as
`MANDATE_STATE_MISSING`, `MALFORMED_PROVIDER_RESPONSE`, or
`UNEXPECTED_MANDATE_STATE`, while provider failures retain their existing
authentication, authorization, timeout, network, rate-limit, not-found, or
temporary-provider codes. It also logs only non-sensitive student/account
references, contact reference, normalized state, and error class.

## Provider versus FoxTutor state

| Layer | Observed state | Evidence |
| --- | --- | --- |
| FreeAgent UI | User reports `ACTIVE` | Human observation; not captured by this run |
| FreeAgent contact API | Exact mandate value not retained | Production account had a successful reconciliation timestamp but no raw response artifact |
| FoxTutor parser before this release | `UNKNOWN` | Production `billing_accounts` row |
| FoxTutor normalized state | `UNKNOWN` | Production `billing_accounts` row |
| Student UI before this release | `Direct Debit status unavailable` | User-reported authenticated page |
| Student UI after this release | Not yet verified | Requires authenticated reload after deployment |

No active state is inferred from the UI report or from the existence of a
verified contact.

## Implementation changes

* Added explicit Direct Debit state classification for missing, malformed and
  unexpected provider values.
* Applied the canonical Direct Debit normalizer to the collection gate instead
  of comparing the provider string directly with lowercase `active`.
* Persisted safe diagnostic code/message for a valid contact response that
  lacks a usable mandate state.
* Added structured, non-secret reconciliation diagnostics.
* Expanded the admin billing audit with provisioning state, last active
  verification, reconciliation freshness, next reconciliation, and the last
  classified error.
* Renamed the provider contact fixture label to make its synthetic nature
  explicit.

## Capability boundary

| Operation | Status | Evidence |
| --- | --- | --- |
| Find contact | VERIFIED in implementation; real read not independently replayed | FreeAgent contact client and verified production mapping |
| Verify contact identity | VERIFIED | Exact `257175` mapping and fail-closed mismatch checks |
| Read mandate status | BLOCKED BY PROVIDER/API BOUNDARY | Field is parsed when exposed; real raw response was not retained |
| Initiate mandate request | REQUIRES HUMAN ACTION | FreeAgent/provider-hosted flow; no FoxTutor bank-data flow |
| Customer authorization | REQUIRES HUMAN ACTION | Provider-hosted authorization |
| Create invoice | SYNTHETIC ONLY | Client and idempotency tests; no real invoice mutation |
| Send/transition invoice | SYNTHETIC ONLY | Client and operation tests |
| Take invoice payment by Direct Debit | SYNTHETIC ONLY | No real collection was initiated |
| Read payment progress | SYNTHETIC ONLY | Normalizer covers observed test shapes; no real payment exists |
| Read settlement/result | SYNTHETIC ONLY | `CONFIRMED` is the only secured payment state |
| Detect failure | SYNTHETIC ONLY | Failure normalization and alerts are tested |
| Retry safely | VERIFIED WITH CONTROLLED TEST | Local idempotency and reconciliation-required paths |
| Reconcile invoice/payment | SYNTHETIC ONLY | No real invoice/payment pair exists |
| Determine customer readiness | SYNTHETIC ONLY | Local readiness tests; mandate readiness remains provider-dependent |

## Acceptance matrix

| Scenario | Provider state | FoxTutor state | Student UI | Admin UI | Evidence |
| --- | --- | --- | --- | --- | --- |
| No mandate | `setup` | `SETUP_REQUIRED` | Setup required | Diagnostic | Synthetic fixture/test |
| Pending mandate | `pending` | `AUTHORISATION_PENDING` | Pending | Diagnostic | Synthetic fixture/test |
| Active mandate | `active` | `ACTIVE` | Active | Diagnostic | Synthetic only; real API/UI not captured |
| Failed mandate | `failed` | `FAILED` | Action required | Diagnostic | Synthetic fixture/test |
| Unknown | null/unexpected | `UNKNOWN` | Unavailable | Classified diagnostic | Synthetic test; real raw value pending |
| Provider unavailable | timeout/auth/network | `UNKNOWN` | Temporary problem | Alert/error code | Adapter tests |
| Contact mismatch | different contact | blocked/`UNKNOWN` | Safe fallback | Critical diagnostic | Audit test |
| Full credit | n/a | `PAYMENT_SECURED` | No collection needed | Audit | Local credit/readiness tests |
| Scheduled collection | scheduled | `PAYMENT_NOT_SECURED` | Awaiting payment | Audit | Synthetic payment test |
| Submitted collection | submitted | `PAYMENT_NOT_SECURED` | Awaiting confirmation | Audit | Synthetic payment test |
| Pending collection | pending | `PAYMENT_NOT_SECURED` | Awaiting confirmation | Audit | Synthetic payment test |
| Confirmed payment | confirmed | `PAYMENT_SECURED` | Paid | Audit | Synthetic payment test |

## Test evidence

The latest executed full suite is:

```text
npm test -- --reporter=dot
37 test files passed
210 tests passed
0 failed
0 skipped
```

Build, legal synchronization, and Wrangler dry-run also pass:

```text
npm run build
npm run check:legal
npx wrangler deploy --dry-run --config wrangler.jsonc
```

The suite includes recurrence, six-week horizon, pause/resume, cancellation,
rescheduling, billing events, credit coverage, payment and mandate
normalization, readiness, provider failures/unknowns, contact identity,
reconciliation/audit, billing history D1 regression, privacy, migration
contracts, and sentinel contracts. Real provider invoice/payment lifecycle,
authenticated browser acceptance, x10 concurrency, and remote D1 production
execution remain unproven here.

## Financial safety

No real invoice, collection, payment, mandate, refund, credit note, or credit
mutation occurred during Phase 7.8. The existing active mandate was not
replaced. No provider identifier beyond the verified contact reference was
copied into application state or documentation.

## Deployment and acceptance

The first committed Phase 7.8 source deployment was:

| Item | Observed value |
| --- | --- |
| Commit | `25e0f384a8ec845134526788f78f445c3bbbc721` |
| Worker version | `042c1fb4-6f62-441f-a967-9ac1fabe01b8` |
| Deployment time | `2026-09-14T18:44:21Z` |
| Remote D1 migrations | No migrations to apply; through `0027_phase77_payment_submitted.sql` |
| Public smoke | `/` 200, `/learn` 302 Access redirect |

The 302 is only perimeter evidence, not authenticated application acceptance.
The documentation-only provenance update will be committed and deployed
separately so the final repository commit and final Worker version are also
recorded exactly.

Required human action: reload the authenticated
`/learn/student/billing` page after deployment and report the displayed state;
an administrator must also inspect
`/learn/admin/billing/audit/2dba78cd-0ce9-4aa2-918f-c3fb9d3b683b`. If the
audit records `MANDATE_STATE_MISSING` or `UNEXPECTED_MANDATE_STATE`, the exact
FreeAgent contact response must be checked in the FreeAgent UI/API boundary
before any mandate or invoice mutation is attempted.
