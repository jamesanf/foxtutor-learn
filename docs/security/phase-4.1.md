# Phase 4.1 notification security

> This is the historical Phase 4.1 security baseline. Current report and
> attachment controls are documented in [`phase-4.2.md`](phase-4.2.md).

- Fox Mail is the only transport boundary. Learn sends server-to-server
  requests using `MAIL_API_TOKEN` and optional Access Service Auth headers;
  secrets never reach templates, browsers, D1 notification rows or logs.
- There is no public notification API and no arbitrary-recipient
  `POST /notifications` endpoint. Events originate only from trusted
  server-side student, lesson, resource, scheduler and report mutations.
- Recipient resolution uses the active linked `STUDENT` user, not a browser
  email field or an unrelated contact record.
- Admin notification history and report creation/sending are role-gated and
  CSRF-protected. Students receive the existing generic authorization response
  for admin routes.
- Email links use authenticated `/learn/student/...` routes. They do not
  contain session tokens, magic login tokens, calendar feed tokens, R2 keys or
  provider URLs. Opening a link still performs normal student ownership checks.
- HTML dynamic values are escaped. Report text is treated as plain text and
  rendered with escaped line breaks. Subject lines are generated from
  controlled event/date values.
- Delivery diagnostics expose only event, recipient, related business record,
  safe category, timestamps and provider reference. Raw request headers,
  provider bodies, private notes and exception stacks are not shown.
- `UNKNOWN` is distinct from `FAILED`; timeout recovery reuses the same
  notification/provider idempotency identity instead of silently sending a new
  message.
- Notification records use references to existing D1 entities and do not
  create a second mail database or store SMTP/provider internals.
