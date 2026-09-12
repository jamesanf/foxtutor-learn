# Phase 3.2 resource UX testing

Date: 2026-09-13

## Automated contracts

- `npm test` covers the resource policy, ownership/security, migration, source-level category removal and resource UX contracts.
- `npm run build` type-checks the Worker and bundles the client dropzone behavior.
- `npm run test:browser` retains the private-shell, focus and reduced-motion contract.
- `git diff --check` rejects whitespace errors.

The resource UX contract asserts that application code contains no active category workflow, the admin list and detail omit category, contextual lesson/student routes exist, the generic route remains available, the desktop metadata row uses a grid, the styled dropzone is accessible, and selected/uploading states are wired.

## Acceptance matrix

| Surface | Required result |
| --- | --- |
| Generic add resource | Student, optional Lesson and File only |
| Student entry point | Student context is read-only; optional Lesson remains available |
| Lesson entry point | Student and Lesson context are read-only; no duplicate selectors |
| File selection | Click, keyboard, drag/drop, selected filename/type/size and Change file |
| Upload | Primary action disables and reports `Uploading…` |
| Error | Context and usable form remain available with one concise message |
| Success | `Resource added.` plus View resource and safe return context |
| Resource list/detail | Category absent; filename, derived type, size and association remain clear |
| Responsive | Grid stacks at mobile widths; no horizontal overflow |
| Security | Existing admin-only mutation and student ownership tests remain green |

Production acceptance still requires an authenticated browser session and controlled fixture cleanup; no real user content is used for that verification.
