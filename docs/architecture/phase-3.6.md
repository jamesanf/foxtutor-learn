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

## Phase 3 closure boundaries

The following remain explicitly unresolved unless accepted by a separate product decision:

| Area | Status | Decision |
| --- | --- | --- |
| PDF compression | NOT COMPLETE | No verified private asynchronous processor or approved confidential-document service is available in this repository. |
| Retention housekeeping | NOT COMPLETE | `retention_until` remains a review horizon until an auditable, idempotent deletion job is accepted. |
| Student cleanup | NON-DESTRUCTIVE | Student deactivation remains separate from permanent deletion. |

No `phase-3-complete` tag is created while mandatory production acceptance or these closure decisions remain unresolved.
