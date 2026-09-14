# Phase 7.14 - Production contact reconciliation and recurring-series repair

## Status

The recurring-series Worker 1101 defect is repaired in source and covered by
targeted tests. The repair is deployed as revision
`9c135954ed64cb24486b7c0376bd6e5aae2e8cca`, Worker version
`08ae3704-1724-4075-8e85-fd5a14a1560e`. Production contact reconciliation
remains pending an authenticated read-only provider call for contact
`21801761`; no provider contact result is claimed here.

## Diagnosed and repaired

- Contact verification now accepts a validated environment from the admin
  operation and uses that environment for connection lookup, token access,
  provider origin, mapping lookup and mapping persistence.
- The admin contact-mapping surface is now Production-only. The legacy
  server-default Sandbox selector cannot receive Production contact IDs.
- Sandbox testing is hidden behind Production billing settings; the backend
  maps the approved test payer `jamesanf@gmail.com` to Sandbox contact
  `257175` without exposing that test mapping in the Production UI.
- Contact verification records only safe environment, company-subdomain,
  provider-origin and normalized mandate-state metadata. It does not mutate
  the FreeAgent contact or infer a mandate state.
- Contact failures now retain an environment-specific administrator message,
  including an explicit not-found result when FreeAgent returns 404.
- Recurring-series creation and resume materialise only the targeted series;
  they no longer rematerialise every active series as part of an interactive
  request.
- The lesson UPSERT now matches the deployed partial unique index on
  `(recurring_series_id, recurrence_key)` by including its non-null predicate.

## Evidence

Remote D1 inspection found two pre-existing active recurring-series rows for
the HAR student. Before deployment they had no materialised lessons or billing
events. The deployed schema defines `idx_lessons_series_occurrence` as a
partial unique index. The previous UPSERT did not specify the predicate
required to target that index, which explains why the series mutation
committed before the post-write materialisation exception produced the Worker
1101 response.

Remote D1 currently contains independent Sandbox and Production connection
rows and independent category mappings. The Production connection is recorded
as `CONNECTED` for `foxlearningltd`. After deployment, the scheduler created
six lessons and six billing events for each existing series, with no duplicate
series created. The real provider contact `21801761` has not been queried from
this execution context because no authenticated provider/browser session is
available.

## Safety boundary

No Production invoice, payment, Direct Debit initiation, credit note, bank
transaction change, contact mutation or £1 test was performed. Existing
recurring rows were inspected only; no duplicate series was created during
diagnosis.

## Remaining acceptance

An authenticated administrator must:

1. read-only verify Production contact `21801761` and record its HTTP result,
   company identity match and mandate state;
2. verify the existing recurring series rather than creating another one;
3. test one controlled Pause and Resume transition;
4. confirm successful browser responses, persisted state, lesson instances,
   billing events and absence of Worker 1101;
5. decide whether the temporary FreeAgent compatibility flag and any
   Production-only secrets can be removed only after both environments remain
   operational.
