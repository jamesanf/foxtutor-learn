# Phase 7.14 testing and evidence

## Automated coverage

- Accounting UI source contract covers environment-aware contact verification.
- Recurrence tests cover the partial-index UPSERT and six-week materialisation.
- Build and targeted accounting/recurrence tests pass for the current source.

## Remote read-only evidence

- D1 schema inspection confirmed the partial unique index predicate.
- Two pre-existing active recurring-series rows were inspected.
- Before deployment, no lesson or billing-event rows existed for those series.
- After deployment, each series has six lessons and six billing events; no
  duplicate series was created.
- Production and Sandbox connection/category records were inspected without
  exposing tokens or secrets.

## Not yet evidenced

- Authenticated `GET /v2/company` and `GET /v2/contacts/21801761`.
- Production contact HTTP result, company match and mandate state.
- Authenticated browser create/pause/resume acceptance.
- Permanent compatibility-secret cleanup.

No financial mutation is part of this test record.
