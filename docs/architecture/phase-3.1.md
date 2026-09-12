# Phase 3.1 resource architecture

Date: 2026-09-13

## Release state

The Phase 3.1 master implementation is deployed to the existing private Learn Worker after the forward-only `0004_resources.sql` migration. Phase 2.12 remains functionally deployed but formally open: its authenticated production, visual and `phase-2.12-complete` tag gates are not being rewritten or claimed by this pass.

## Storage

Production uses the dedicated private R2 bucket `foxtutor-learn-resources`, bound to the Worker as `RESOURCES_BUCKET`. Local configuration uses `foxtutor-learn-resources-local`. Neither bucket has public access or a custom public domain. Object bytes are never stored in D1.

Every object uses the server-generated namespace:

```text
resources/<opaque-resource-id>/original
```

Original filenames, student names, lesson names and browser-supplied keys are never used as storage keys.

## D1 metadata and ownership

`resources` stores the original filename, trusted content type, byte size, SHA-256 fingerprint, optional PDF page count, category, status, uploader, student and lesson relationships, timestamps, a 12-month retention date and an idempotency key. A resource must have a student or lesson association; the upload flow currently sets the authoritative student relationship for both general student resources and lesson resources.

Student queries authorize through the active Learn user to student relationship in SQL. Lesson resources additionally resolve `resource -> lesson -> student`. Admin queries are role-gated by the existing Learn session and route authorization.

## Upload and failure handling

Uploads are synchronous through the Worker and are limited to 25 MiB. The server validates the filename, extension, MIME relationship, size, content signature and student/lesson relationship. The initial supported set is PDF, DOCX, TXT, PNG, JPEG and WEBP. Executable, HTML, SVG and arbitrary archive types are rejected.

The D1 row is created as `uploading` with a unique idempotency key, then the private R2 object is written. A successful write transitions the row to `available`; a failed write marks it `failed`. If the final metadata transition fails, the Worker deletes the object and marks the row failed. Retrying the same submitted idempotency key does not create a second available resource.

Phase 3.1 performs lightweight PDF signature and page-count inspection only. It does not run OCR or synchronous PDF compression. The hard 25 MiB limit avoids an oversized synchronous processing path; asynchronous compression can be added later without changing ownership or object-key semantics.

## Download and deletion

Downloads are Worker-authenticated `GET`/`HEAD` responses. The Worker authorizes the D1 relationship before reading R2, sets private/no-store/noindex headers, and serves PDFs inline while forcing other supported types to attachment download. No R2 URL or signed URL is exposed.

Deletion is an explicit in-app confirmation. The Worker authorizes first, deletes the exact R2 key, then tombstones the D1 row as `deleted`. If metadata cleanup fails after object deletion, the response reports reconciliation is required rather than claiming a clean success.

Active resources do not expire automatically. The stored `retention_until` date records the initial 12-month review horizon without deleting genuine learning material. Failed and deleted rows remain available for controlled reconciliation; no broad destructive cleanup job is enabled in this pass.

