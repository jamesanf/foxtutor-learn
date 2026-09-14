# Phase 7.16 acceptance evidence

Status: **PHASE 7.16 NOT COMPLETE**

The automated implementation and deployment checks pass. Live provider, authenticated browser, mailbox, and real-money gates remain explicitly separate and are not inferred from mocked tests or D1 metadata.

## Automated results

| Suite | Result | Evidence |
| --- | --- | --- |
| Full automated suite | AUTOMATED PASS | 39 test files, 250 tests, 250 passed, 0 failed, 0 skipped, 13.36s |
| Unit tests | AUTOMATED PASS | 35 files, 214 tests |
| Integration tests | AUTOMATED PASS | 3 files, 34 tests, 34 passed, 0 failed, 0 skipped, 3.80s |
| Security tests | AUTOMATED PASS | 1 file, 2 tests, 2 passed |
| Static browser contract | AUTOMATED PASS | Keyboard focus, reduced motion and noindex contract |
| Visual browser acceptance | LIVE PROVIDER BLOCKED | Chrome DevTools endpoint `127.0.0.1:9222` unavailable |
| TypeScript/client build | AUTOMATED PASS | `npm run build` |
| Legal check | AUTOMATED PASS | `npm run check:legal` |
| Wrangler dry-run | AUTOMATED PASS | 632.80 KiB upload plan, no deployment mutation |

## Live evidence matrix

| Test | Environment | Customer | Operation | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OAuth Production | Production | James | OAuth/provider authentication | Authenticated Production provider access | Not independently exercised | LIVE PROVIDER BLOCKED | Cloudflare/provider credentials unavailable |
| Company read | Production | James | `GET /v2/company` | Fox Learning Ltd | D1 connection metadata only | LIVE PROVIDER BLOCKED | Remote D1 shows connected Production record |
| Production contact read | Production | James | `GET /v2/contacts/21801761` | Contact 21801761 | Not independently exercised | LIVE PROVIDER BLOCKED | Authenticated provider GET unavailable |
| Production mandate read | Production | James | Contact mandate read | `active` | Local last error was `MANDATE_STATE_MISSING` from prior reconciliation | LIVE PROVIDER BLOCKED | Provider response not directly captured |
| Sandbox contact read | Sandbox | James | `GET /v2/contacts/257175` | Contact 257175 | Not independently exercised | LIVE PROVIDER BLOCKED | Authenticated provider GET unavailable |
| Sandbox mandate read | Sandbox | James | Contact mandate read | Provider state recorded | Not independently exercised | LIVE PROVIDER BLOCKED | Authenticated provider GET unavailable |
| Contact verification | Production | James | Verify mapping | VERIFIED plus immediate billing reconciliation | Code path deployed; live action not repeated | HUMAN ACCEPTANCE REQUIRED | Worker version `75dc2f79-0f0c-4f18-8256-4b5ae0e25fc1` |
| James UI mandate | Production | James | Authenticated `/learn/billing` | Direct Debit active if provider is active | Not observed | HUMAN ACCEPTANCE REQUIRED | `/learn` redirects 302 to Cloudflare Access |
| Sandbox invoice | Sandbox | James | Controlled invoice | Provider invoice created once | Not tested | NOT TESTED | No live Sandbox mutation performed |
| Sandbox payment readiness | Sandbox | James | Read-only readiness | Correct mandate/invoice distinction | Not tested | NOT TESTED | No authenticated provider path |
| Sandbox reconciliation | Sandbox | James | Provider-to-FoxTutor read-back | State reconciled | Not tested | NOT TESTED | No live provider call |
| New customer lookup | Production | kjhgbh@gmail.com | Search contacts | Existing contact identified or absent | Not tested | NOT TESTED | No live provider mutation |
| New customer creation | Production | kjhgbh@gmail.com | Create exactly one contact | One contact, HTTP 201 | Not tested | NOT TESTED | No live provider mutation |
| New customer mapping | Production | kjhgbh@gmail.com | Persist mapping | VERIFIED with Production identity | Not tested | NOT TESTED | No live provider mutation |
| New customer email | Production | kjhgbh@gmail.com | Dispatch setup notification | Safe provider-boundary email | Not tested | NOT TESTED | No live send performed |
| Mailbox observation | Production | kjhgbh@gmail.com | Human mailbox check | Message visible in mailbox | Not observed | HUMAN ACCEPTANCE REQUIRED | Mailbox access unavailable |
| New customer mandate | Production | kjhgbh@gmail.com | Re-read provider mandate | setup/pending/active/etc. | Not tested | NOT TESTED | No live provider call |
| Customer credit | Sandbox | Controlled fixture | Credit ledger suite | Full/partial/zero/reversal correct | Automated coverage only | AUTOMATED PASS | Existing unit/integration suite |
| Cancellation | Sandbox | Controlled fixture | Cancel lesson/series | Correct lesson, credit, audit and series | Automated coverage only | AUTOMATED PASS | Existing unit/integration suite |
| Reschedule | Sandbox | Controlled fixture | Reschedule lesson | No duplicate invoice/provider record | Automated coverage only | AUTOMATED PASS | Existing unit/integration suite |
| Pause | Sandbox | Controlled fixture | Pause recurring series | Future materialization suppressed | Automated coverage only | AUTOMATED PASS | Existing unit suite |
| Resume | Sandbox | Controlled fixture | Resume recurring series | Materializes exactly once | Automated coverage only | AUTOMATED PASS | Existing unit suite |
| Scheduler | Local/Sandbox | Controlled fixture | Repeated scheduled processing | Stable counts/no duplicates | Automated coverage only | AUTOMATED PASS | Existing unit/integration suite |
| Outbox | Local/Sandbox | Controlled fixture | State transitions | Auditable terminal/retry states | Automated coverage only | AUTOMATED PASS | Existing accounting tests |
| Replay | Local/Sandbox | Controlled fixture | Repeat logical commands | One logical mutation | Automated coverage only | AUTOMATED PASS | Existing idempotency tests |
| Concurrency | Local/Sandbox | Controlled fixture | Two workers | One winner/provider mutation | Automated coverage only | AUTOMATED PASS | Existing claim/idempotency tests |
| Real £1 gate | Production | James | Read invoice/provider gate | READY FOR REAL £1 = YES | Not read | HUMAN ACCEPTANCE REQUIRED | No authenticated admin session |
| Real £1 authorization | Production | James | Explicit administrator confirmation | Confirmation must be explicit | Not authorized | HUMAN ACCEPTANCE REQUIRED | No authorization supplied |
| Real £1 Direct Debit | Production | James | One £1 collection | At most one collection | Not initiated | HUMAN ACCEPTANCE REQUIRED | Financial safety rule followed |
| Real £1 provider state | Production | James | Poll provider | submitted/pending/confirmed/failed | Not observed | NOT TESTED | No collection initiated |
| Real £1 FoxTutor reconciliation | Production | James | Reconcile operation/invoice/history | Full audit chain | Not tested | NOT TESTED | No collection initiated |
| Final billing UI | Production | James | Authenticated browser read | Mandate/invoice/collection distinct | Not observed | HUMAN ACCEPTANCE REQUIRED | Cloudflare Access blocks unauthenticated probe |
| Final audit | Production | James | Billing chain audit | PASS with no unsafe gaps | Not tested live | NOT TESTED | No authenticated live path |

## James read-only D1 snapshot

The remote D1 read was read-only and showed:

- Student: `jamesanf@gmail.com`
- Production mapping: VERIFIED, contact `21801761`, `https://api.freeagent.com/v2/contacts/21801761`
- Sandbox mapping: VERIFIED, contact `257175`, `https://api.sandbox.freeagent.com/v2/contacts/257175`
- Billing account before live reconciliation: `provider_environment=sandbox`, `mandate_state=UNKNOWN`, `provisioning_state=UNKNOWN`
- Prior local error: `MANDATE_STATE_MISSING`
- Production and Sandbox accounting connection records both existed as CONNECTED

This is the reproduced stale-environment/state defect. The deployed fix makes the current verified environment authoritative, forces `UNKNOWN` refresh even when a transient error set a future retry time, validates contact identity, and persists the provider mandate state to `billing_accounts`.

## Bug register

| ID | Severity | Symptom | Root cause | Fix/regression | Deployed/live status |
| --- | --- | --- | --- | --- | --- |
| 7.16-001 | P0 | James UI could remain `Direct Debit status unavailable` after verified Production mapping | Contact verification persisted only the link; billing account remained stale and could be Sandbox-pinned by migration history | Immediate verified-contact reconciliation; current-environment repair; provisioning regression tests | Deployed; live provider/UI verification open |
| 7.16-002 | P1 | Sandbox James mapping could verify the caller's Production ID | Normalized Sandbox fixture ID was calculated but raw input ID was sent to the provider GET | Use normalized environment-specific reference; URL assertion regression | Deployed; automated pass |
| 7.16-003 | P1 | A wrong provider contact could be accepted | Manual mapping verification did not compare returned contact email to Learn student identity | Exact email check plus wrong-contact regression | Deployed; automated pass |
| 7.16-004 | P1 | Old transient `UNKNOWN` could remain cached until a future retry time | Student route suppressed refresh when `last_error_code` existed | Any `UNKNOWN` forces safe read/reconciliation; policy regression | Deployed; automated pass |
| 7.14-001 | P1 | Recurring-series 1101 was previously reported | Live browser recurrence path was not independently accepted in this phase | Existing automated recurrence coverage retained | Live browser reproduction not tested |
| 7.15-001 | P1 | Human-authorization scope remained unproven live | Production financial authorization was not exercised | Existing explicit authorization gate retained | Human acceptance required |
| 7.15-002 | P1 | Paid/due provider fields remained unproven live | No authenticated live invoice read-back | Existing provider adapter tests retained | Live provider acceptance required |

## Deployment provenance

- Source commit: `62b532c12e4d006911943dc97f0e95a174e39cad`
- Worker version: `75dc2f79-0f0c-4f18-8256-4b5ae0e25fc1`
- D1 migration state: no migrations to apply; latest repository migration remains `0031_production_direct_debit_authorization.sql`
- Wrangler dry-run: PASS
- Production smoke: PASS; `/learn` returned Cloudflare Access `302`
- Temporary compatibility flag: retained
- Git status: clean
- Origin: synchronized with `origin/main`

Because the live provider, authenticated UI, mailbox, new-customer, Sandbox mutation, and real-money gates remain open, **PHASE 7.16 NOT COMPLETE**.
