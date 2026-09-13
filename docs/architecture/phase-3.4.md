# Phase 3.4 resource finding UX

Date: 2026-09-13

## Product decision

The resource manager is a teaching-material finder, not a database administration form. Search is the primary interaction, refinement is secondary, and the result list remains the dominant surface.

## Admin information architecture

- The admin page uses one database-backed search field for filename, active student name and lesson context (`lessons.notes` where context exists).
- Suggestions are served by the authenticated `GET /learn/admin/resources/search?q=...` route. Each category is bounded to five records and is generated from current D1 data; no library is preloaded into the browser.
- Student, lesson, file type and added-date controls are custom server-rendered listbox/popover controls inside a filter panel collapsed by default. Sorting is a compact control outside that panel.
- Active student, lesson, type and date criteria are shown as removable chips. Search, filter, sort, page and page-size state remain represented by the existing query contract.
- The existing parameterized D1 filtering, pagination, page-scoped selection, bulk deletion and resource action authorization are preserved.

## Student information architecture

Students receive a separate read-only resource surface. It has an own-resource search field scoped server-side to the authenticated student, followed by resource cards with only Open and Download actions. It intentionally has no admin filters, student selector, lesson selector, sorting, selection, deletion, details administration view or upload control.

Both surfaces share FoxTutor typography, spacing, metadata treatment and inline SVG actions, but the information architecture is deliberately different:

```text
ADMIN:   search -> optional filters -> sort -> manage results
STUDENT: search own resources -> use results
```

## Technical boundaries

All resource suggestions and result searches remain authenticated and server-side. Search input is trimmed, length-bounded and escaped before parameterized `LIKE` predicates are used. Student resource queries retain the active-user and active-student ownership predicates before search criteria are applied. No public R2 URL or unauthenticated search endpoint is introduced.

PDF compression remains **NOT COMPLETE** because this repository still has no verified private asynchronous processing binding or approved confidential-document processor. Retention housekeeping remains **NOT COMPLETE** because no safe, auditable eligibility and deletion job has been established. Student deactivation remains non-destructive; there is no new destructive student-deletion workflow in this phase.
