# Phase 3.5 resource finder and header refinement

Date: 2026-09-13

## Interaction architecture

The resource finder remains server-rendered HTML enhanced by the existing TypeScript client. Admin and student result surfaces expose a focused `X-Resource-Fragment: 1` response contract. The response contains only the finder UI (admin), result count/list/pagination, and the state URL; it does not return the application shell or global header.

When JavaScript is available, search, filters, sort, pagination, page size, clear actions, and browser Back/Forward use:

```text
URL state -> authenticated fetch -> D1 query -> focused DOM replacement
```

The client uses `history.replaceState()` for ordinary state changes, keeps the filter panel open during result updates, applies a loading opacity rather than blanking results, and uses an `AbortController` plus request sequence to prevent stale responses from winning. Native select controls are not used for the primary admin finder controls. A non-JavaScript browser retains the existing GET form fallback.

Admin result replacement clears page-scoped selections and rebinds the existing bulk and per-resource action behavior. Student result replacement remains ownership-scoped by `listResourcesForStudent`; the fragment endpoint is reached only after the normal authenticated Learn session and role checks.

## Visual decisions

- Admin filter controls use equal CSS grid tracks on desktop, two columns at intermediate widths, and one column on narrow mobile screens.
- Filter triggers share height, padding, border, and value truncation rules.
- Sort is an icon-led custom popover with an accessible `aria-label` and an inline check for the active option.
- The brand block contains the FoxTutor logo and `FoxTutor Learn` once.
- Admin identity is reduced to `ADMIN` and `Log out`; student identity remains outside the product brand.

## Phase 3 technical boundaries

The following decisions remain explicit and are not represented as completed work:

| Area | Status | Decision |
| --- | --- | --- |
| PDF compression | NOT COMPLETE | No verified private asynchronous processor or approved confidential-document service is available in this repository. |
| Retention housekeeping | NOT COMPLETE | `retention_until` remains a review horizon until an auditable, idempotent deletion job is accepted. |
| Student cleanup | NON-DESTRUCTIVE | Student deactivation remains separate from permanent deletion. |

Authenticated production browser acceptance, deployment identity, Worker version, screenshots, and fixture cleanup must be recorded from the actual target environment before a Phase 3 completion tag is created.
