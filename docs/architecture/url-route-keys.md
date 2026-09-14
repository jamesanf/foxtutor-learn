# Learn URL route keys

FoxTutor Learn uses a compact URL-safe Base64 key for UUID-backed identifiers
in user-facing routes and query-string links. The shared implementation is in
`src/domain/lesson-url.ts`:

- `entityUrlKey()` generates the compact key;
- `entityIdFromUrlKey()` decodes compact keys and continues accepting canonical
  UUIDs for backwards compatibility;
- lesson and recurring-series links use the same convention.

This applies to student, lesson, recurring-series, resource, notification,
reschedule, accounting, billing, credit and billing-audit links. Existing UUID
bookmarks remain valid and newly rendered Learn pages use compact keys.

The compact key is an identifier presentation format, not a security boundary.
Every route still requires the appropriate authenticated role and performs the
existing ownership or administrator authorization check after decoding the
identifier. It must not be treated as encryption or as proof that a record is
secret.
