# Phase 3.4 resource finding UX testing

Date: 2026-09-13

## Automated contracts

The resource UI contracts verify that:

- search is labelled for files, students and lessons;
- the admin filter trigger is expandable and the prior exposed native filter row is absent;
- custom listbox/popover markup and bounded server-backed suggestion wiring exist;
- suggestion keyboard behavior includes ArrowDown, ArrowUp, Enter and Escape;
- student resources use an own-resource search and retain read-only action separation;
- existing upload, action, selection and server-side filtering contracts remain present.

Run:

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
| Admin search | D1-backed filename, student and available lesson-context search; trimmed, case-insensitive and escaped input |
| Suggestions | Authenticated endpoint, current D1 data, five-or-fewer results per category, keyboard navigation and Escape |
| Filters | Collapsed by default, compact custom controls, student-dependent lessons, active removable chips |
| Pagination | Existing `q`, `student`, `lesson`, `type`, `added`, `sort`, `page` and `size` state remains durable in URLs |
| Admin actions | Open, Download, Details, Delete and page-scoped bulk deletion remain accessible and authorized |
| Student | Own-resource search only; no admin filter, selection, mutation or details-management surface |
| Responsive | Search remains primary and result cards remain usable without horizontal overflow |

Authenticated production browser acceptance, screenshots and controlled fixture cleanup are still required before a Phase 3 completion tag can be created.
