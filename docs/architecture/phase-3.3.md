# Phase 3.3 resource manager architecture

Date: 2026-09-13

## Scope

Phase 3.3 refines the existing private resource system without changing the R2 bucket, object namespace, ownership model or Add Resource workflow. The application remains server-rendered with small client enhancements; no framework or icon dependency was added.

## Resource manager queries

The admin list applies all filters in D1 before pagination:

- `q` searches normalized filename and student name with escaped `%` and `_` wildcards.
- `student` accepts a server-side student-record ID as a query criterion; only active tutoring students are offered in the UI.
- `lesson` is constrained to the selected student in the UI and remains an ordinary parameterized D1 predicate.
- `type` maps to the trusted content-type policy rather than a stored classification.
- `added` maps to Any time, Today, Last 7 days or Last 30 days.
- `sort` is limited to newest, oldest and filename A–Z/Z–A.

Pagination links and page-size forms carry the active query state. Changing a filter submits the form and naturally starts at page one. The result list only includes available, non-deleted resources.

## Actions and authorization

Open, Download, Details and Delete are represented by inline SVG icons with accessible names, titles and keyboard focus styling. Open and student/lesson read-only actions remain Worker routes; Open uses `target="_blank"` and `rel="noopener noreferrer"`. The response remains private/no-store and chooses inline content disposition only for PDF, image and text content. Download adds `?download=1` to force attachment disposition.

Single deletion requires an explicit confirmation through the client-enhanced icon trigger; without enhancement the icon does not submit. The detail page keeps a visible confirmation disclosure. Bulk deletion submits only visible-page checkbox IDs, then resolves every ID server-side under the authenticated admin session before deleting the exact R2 object and tombstoning D1 metadata. Partial failures are reported rather than represented as full success.

## Lesson allowance

`MAX_LESSON_STORAGE_BYTES` is the single 25 MiB configured aggregate allowance. Before a lesson upload is inserted, D1 sums non-deleted `uploading` and `available` resources for that lesson and rejects a file that would exceed the allowance. This is a server-side guard; the browser never calculates or authorizes the allowance.

## Deferred technical boundaries

PDF compression is **DEFERRED WITH DOCUMENTED TECHNICAL REASON**. The current repository has no verified asynchronous, private processing binding or approved confidential-document processor. The implementation therefore keeps lightweight PDF signature/page inspection and the hard 25 MiB per-file limit rather than inventing an external service or blocking a Worker request on heavy CPU work.

Retention housekeeping is **DEFERRED WITH DOCUMENTED OPERATIONAL DECISION**. `retention_until` remains auditable metadata for a minimum 12-month review horizon. No automatic deletion job is enabled because genuine teaching material must not be removed solely due to an elapsed metadata date. Student deactivation remains non-destructive; existing student queries require an active linked student and active user.
