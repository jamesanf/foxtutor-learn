# Phase 3.2 resource UX architecture

Date: 2026-09-13

## Scope

Phase 3.2 is a local workflow remediation on top of the Phase 3.1 private resource architecture. R2 keys, D1 ownership, validation, signatures, SHA-256 metadata, PDF inspection, idempotency, deletion and student/lesson authorization remain unchanged.

## Resource meaning

Resources are described by their filename, derived file metadata, student relationship and optional lesson relationship. Phase 3.1 introduced category metadata as part of the initial model; product review found that manual classification added friction without operational value. The application no longer exposes, validates, queries or renders category. The legacy D1 column remains unused for schema compatibility rather than introducing a destructive production migration.

## Entry contexts

`/learn/admin/resources/new` supports three server-resolved contexts:

- Generic: Student and optional Lesson controls are shown in one desktop grid.
- Student: the active student is rendered as read-only context and Lesson remains optional.
- Lesson: the active student and lesson are rendered as read-only context; the upload form needs only a file.

Query parameters are convenience only. The Worker resolves the lesson and student against active D1 records before displaying context or accepting the association. The hidden return context is reduced to the known internal lesson, student or resources destination; arbitrary redirect URLs are not accepted.

## Upload surface

The file is the visual centre of the workflow. A keyboard-accessible styled dropzone supports click-to-browse, drag-and-drop, explicit accepted formats and the 25 MB limit. After selection it shows filename, derived type, human-readable size and a Change file action. Submission disables the primary action and reports `Uploading…`; successful uploads show a concise success page with View resource and context-appropriate return navigation.

## Phase 3.3 follow-on

The subsequent resource-manager refinement keeps this upload boundary unchanged. Filtering, page-scoped selection, bulk deletion, icon actions and explicit Open/Download/Details controls are implemented on the admin/list surfaces, while private R2 authorization and the contextual Add Resource workflow remain the Phase 3.1/3.2 foundation.
