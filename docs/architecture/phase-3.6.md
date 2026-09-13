# Phase 3.6 resource UI geometry and closure boundaries

Date: 2026-09-13

## Final UI refinement

Phase 3.6 is a precision pass over the Phase 3.5 resource finder. The existing server-rendered HTML, TypeScript enhancement, authenticated fragment endpoint, History API state, request cancellation, and role-separated student/admin surfaces remain unchanged.

Admin filter controls now use:

- four equal `minmax(0, 1fr)` grid tracks on desktop;
- equal two-column tracks at intermediate widths and one-column tracks on narrow mobile screens;
- fixed trigger heights, shared padding, border, radius, and a single inline SVG chevron;
- one-line, ellipsized closed values with concise defaults: `All`, `Choose student`, `Any`, and `Any`;
- deliberate popover width limits that cannot resize the filter grid;
- compact active chips such as `James Fox`, `PDF`, and `30 days`.

The filter and sort toolbar controls share a fixed outer height. `ADMIN` and `Log out` are aligned by the header identity flex row and normalized control line-height. The mobile header remains a single compact row rather than stacking the identity group.

Active filter chips and `Clear all` are rendered inside the finder form so the existing delegated no-reload interaction boundary handles them consistently with search, filters, sort, pagination, and page size.

## Phase 3.8 scope decisions

The final Phase 3 scope decision is to defer both capabilities rather than invent unsupported infrastructure:

- **PDF compression — DEFERRED TO FUTURE PHASE.** The Worker-only architecture has no verified private asynchronous PDF processor or approved confidential-document processing credentials. Synchronous CPU-heavy processing or an external public-document service would violate the privacy and execution-boundary requirements.
- **Retention housekeeping — DEFERRED TO FUTURE PHASE.** `retention_until` remains an auditable review horizon. Phase 3 does not automatically delete active learning material because no scheduled, idempotent D1/R2 cleanup mechanism has been accepted for this product.

These are product-scope decisions, not completed capabilities. Future work must provide private processing or housekeeping infrastructure, failure recovery, auditability and controlled D1/R2 consistency tests before implementation.

## Phase 3 closure boundaries

The following remain explicitly unresolved unless accepted by a separate product decision:

| Area | Status | Decision |
| --- | --- | --- |
| PDF compression | DEFERRED TO FUTURE PHASE | No verified private asynchronous processor or approved confidential-document service is available in this repository. |
| Retention housekeeping | DEFERRED TO FUTURE PHASE | `retention_until` remains a review horizon; automatic deletion is outside Phase 3. |
| Student cleanup | COMPLETE | Student deactivation remains non-destructive and separate from permanent deletion. |

The scope decisions above remove compression and retention housekeeping from the mandatory Phase 3 closure matrix. No `phase-3-complete` tag is created until the remaining authenticated production acceptance, populated pagination evidence, cross-student direct-object evidence, exact deployment verification and visual screenshots are complete.

## Future work

### Private PDF optimization pipeline

Provide a private asynchronous processor that can safely handle oversized tutoring PDFs, preserve recoverable failure states and remove staging objects only after successful validation.

### Automated resource retention housekeeping

Provide a scheduled, idempotent and auditable D1/R2 reconciliation job that selects only eligible resources and never deletes active learning material accidentally.
