# Phase 7.2 testing

> This is controlled local evidence for the Phase 7 baseline, not final
> authenticated runtime or provider acceptance. The current open runtime issue
> is the reported 1101 on `/learn/student/billing`; a route-level regression
> must be added when the root cause is reproduced.

The controlled suite covers the existing Phase 7.1 boundary plus:

- the hard `Europe/London` invariant and rejection of arbitrary timezones;
- GMT, BST, spring-forward and autumn-backward recurrence conversion;
- six-week bounded materialisation, replay and overridden-instance safety;
- recurring-series pause, resume, end and cancellation interaction;
- canonical payment-readiness states and the definition of
  `PAYMENT_SECURED`;
- credit-covered, partial-credit, provider-failure and unknown-result paths;
- invoice status refresh and payment reconciliation seams;
- alert deduplication and acknowledgement/resolution audit;
- billing history, invoice detail and student billing route authorization;
- local migration and trigger/schema checks.

Real provider acceptance is not represented by unit tests. It must be attached
as separately dated FreeAgent Sandbox and GoCardless Sandbox evidence, or
explicitly recorded as a human-only gate.
