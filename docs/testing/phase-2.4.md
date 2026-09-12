# Phase 2.4 testing

## Local automated coverage

The Phase 2.4 suite covers:

- cryptographically random URL-safe token shape and hash separation;
- forward-only migration shape;
- role route classification;
- stable lesson UIDs across changed timestamps and statuses;
- UTC instant preservation for stored lesson times;
- scheduled/completed/cancelled mapping;
- comma, semicolon, newline and backslash escaping;
- CRLF output and UTF-8 75-octet line folding;
- bounded 90-day past/365-day future feed range.

Run:

```sh
npm test
npm run build
npm run check
npm run test:browser
npm run test:production
```

## Local HTTP acceptance

A clean local D1 was migrated through `0003_calendar_feeds.sql` and controlled admin, Student A and Student B fixtures were served through the actual Worker route. The checks passed for:

- admin feed success, student names and omission of private notes;
- Student A feed containing Student A's lesson only and omitting Student B data;
- Student B feed isolation;
- malformed/random token generic 404 denial;
- `text/calendar`, `private, no-store`, noindex and inline response headers;
- lesson rescheduling and cancellation reflected on the next request under the same UID;
- old token denial after rotation and new token success;
- admin and student subscription UI generation with private-link warning and copyable URL.

The controlled local D1 and temporary Worker state were removed after the checks. No raw token is committed or documented.

## Production gates not claimed locally

The following require a future bounded production pass:

- remote application of `0003_calendar_feeds.sql`;
- Worker deployment and production smoke;
- narrowly scoped Cloudflare Access exception for only the token route;
- authenticated admin/student acceptance using the controlled production identities;
- real Apple or Google subscription acceptance, or a documented external-client limitation;
- controlled fixture cleanup, deployment evidence and final phase tag.
