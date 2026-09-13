# Phase 3.3 resource manager testing

Date: 2026-09-13

## Automated contracts

The local implementation adds contracts for:

- server-side search/type/date filtering and parameterized resource queries;
- active-student and student-dependent lesson filter controls;
- filter-preserving pagination and page-size controls;
- page-scoped select-all, accessible checkbox labels and bulk-delete submission;
- accessible Open, Download, Details and Delete icon actions;
- authenticated new-tab Open links and explicit attachment Download links;
- student/lesson read-only resource action surfaces;
- centralized per-file/lesson size and derived type policy;
- continued absence of the legacy application field.

Run the existing gates:

```text
npm test
npm run build
npm run check
npm run test:browser
npm run test:production
git diff --check
```

## Acceptance matrix

| Surface | Required result |
| --- | --- |
| Admin filters | Search, active student, dependent lesson, type, added date and compact sort operate server-side |
| Pagination | Active filters survive page and page-size changes; filter changes return to page one |
| Selection | Header selects only visible rows; row labels name the file; selection count appears only when needed |
| Bulk delete | CSRF-protected admin POST resolves every ID server-side, deletes exact R2 keys, tombstones D1 and reports partial failure |
| Single delete | Icon is accessible and requires deliberate confirmation |
| Open | Authenticated Worker response opens in a new tab with no public R2 URL |
| Download | Authenticated Worker response uses attachment disposition and the safe filename |
| Student | Own resources only; Open/Download only; no admin filters or mutations |
| Lesson allowance | Uploads exceeding the configured aggregate lesson allowance are rejected server-side |
| Responsive | Resource filters and rows remain usable without horizontal overflow at desktop, tablet and mobile widths |

## Still-open release gates

This document does not claim authenticated production acceptance. Controlled production fixtures, real browser clicks, screenshots at 1440×900, 1024×768, 820×1180 and 390×844, final deployment verification, fixture cleanup and the Phase 3 completion decision remain required.
