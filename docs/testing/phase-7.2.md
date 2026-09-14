# Phase 7.2 testing

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
