# Phase 4.1 testing and acceptance

> This is the historical Phase 4.1 test record. The current Phase 4.2
> acceptance matrix is maintained in [`phase-4.2.md`](phase-4.2.md).

## Automated coverage

The current suite covers:

- finite notification vocabulary, event keys and 24-hour reminder calculation;
- material lesson-change detection and no-op suppression;
- canonical Learn links, HTML escaping and report content projection;
- invitation/report template structure and private-note exclusion;
- Fox Mail URL, authentication, sender, idempotency key, HTML payload and
  provider-reference capture;
- provider/network failure classification as retryable `UNKNOWN`;
- forward-only report/notification migrations and D1 uniqueness/state checks;
- admin route classification and role boundary.

Run:

```sh
npm test
npm run build
npm run check
npm run test:browser
npm run test:production
git diff --check
```

## Required integration harness

The Fox Mail adapter accepts a fetcher, so tests can deterministically capture
recipient, subject, text/HTML, sender and `Idempotency-Key`. The result model
distinguishes:

| Provider result | Learn state | Retry |
|---|---|---|
| 2xx with optional reference | `SENT` | No |
| 400/401/403/422 | `FAILED` | No |
| 429/5xx/network failure | `FAILED` | Bounded |
| timeout after request may have transmitted | `UNKNOWN` | Same key only |

The database unique idempotency key is the logical-event assertion; the
provider key is the delivery-attempt assertion.

## Acceptance matrix

| Capability | Implementation | Automated evidence | Production evidence | Status |
|---|---|---|---|---|
| Student invitation | Worker student-create event | Template/key tests | Requires controlled authenticated fixture | Local |
| Lesson created/changed | Worker lesson mutation events | Material-change tests | Requires controlled fixture | Local |
| Reminder | Scheduled Worker, 24-hour policy, five-minute cron | Due calculation/query coverage | Requires deployed scheduler fixture | Local |
| Resource added | `available` transition event | Template/authorization paths | Requires resource fixture | Local |
| Cancellation processed | Existing admin cancelled transition | Event contract | Requires controlled fixture | Local |
| Cancellation requested | Dormant contract only | Contract vocabulary | Not applicable until Phase 5 | Deferred |
| Lesson report | Completed-lesson admin form and notification | Template/report model tests | Requires controlled report fixture | Local |
| Provider success | Fox Mail adapter | Mock success/reference test | Requires Fox Mail production secret | Blocked |
| Provider failure/unknown | Safe categories/state model | Mock failure tests | Not intentionally induced in production | Local |
| Idempotency | D1 unique key + provider key | Key assertions | Requires live delivery replay | Local |
| Student isolation | Server-side linked-user resolution | Existing ownership tests plus typed projections | Requires two-account fixture | Local |
| Authenticated links | `/learn/student/...` links | Canonical/escaping tests | Requires authenticated browser check | Local |
| Admin failure view | `/learn/admin/notifications` | Route/role contracts | Requires authenticated browser check | Local |

Production acceptance is not claimed until Fox Mail restores its documented
internal secret and non-interactive Access Service Auth path.
