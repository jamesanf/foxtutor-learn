# Phase 3.1 resource security

## Boundaries

- All resource routes remain under `/learn/*`, behind the existing Cloudflare Access perimeter and Learn session.
- The R2 bucket is private and has no public URL.
- D1 metadata authorization is checked before every download and mutation.
- Students receive resources only through their active student relationship or an authorized lesson relationship.
- Unknown resource IDs return the standard not-found response to avoid cross-student existence disclosure.
- Resource routes retain `X-Robots-Tag`, `Cache-Control: private, no-store`, CSP and `nosniff` protections.

## Upload controls

Only authenticated admins can upload and delete resources. CSRF is required for multipart upload and delete mutations. Uploads use server-generated resource IDs and storage keys, a 25 MiB limit, a constrained allowlist, filename/path validation, magic-byte checks for binary formats and server-side student/lesson relationship validation.

HTML, SVG, JavaScript, shell, executable, installer and arbitrary archive extensions are not accepted. PDFs are served inline only after authorization; other supported types are attachments. Original filenames are escaped in HTML and sanitized before use in `Content-Disposition`.

## Retry and partial failure

The unique idempotency key prevents a retried upload from creating a second available row. Upload metadata starts in `uploading`, failed R2 writes become `failed`, and the Worker attempts exact-key cleanup if the availability transition cannot be committed. Deletion removes the exact object before tombstoning metadata and reports a reconciliation error if the second step fails.

No access URL, token, bucket name or private document content is logged or persisted in page HTML.

