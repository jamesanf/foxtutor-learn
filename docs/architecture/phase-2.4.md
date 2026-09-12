# Phase 2.4 — Live calendar subscriptions

## Scope

Learn publishes a read-only iCalendar projection of the existing `lessons` domain. It does not synchronize with Google or Apple APIs, provide CalDAV, accept calendar mutations, or create a second event store.

The live route is:

```text
GET /learn/calendar/feed/<opaque-token>
```

It authenticates with the bearer token in the URL rather than the interactive Learn session so subscribed calendar clients can refresh independently.

## Feed records and ownership

Migration `0003_calendar_feeds.sql` adds one durable `calendar_feeds` row per active Learn user. The row stores a feed ID, owner user ID, optional explicitly linked student ID, SHA-256 token hash, last four token characters, creation time, rotation time and revocation time. Raw tokens are generated in memory and are not stored in D1.

An admin feed has an admin owner and no student ID. A student feed has a student owner and the exact active `students.learn_user_id` link. Contact email, student name and predictable IDs are not used as feed credentials or ownership selectors. Invalid, revoked, disabled and cross-owner tokens receive the same generic 404 response.

Regeneration updates the existing feed identity with a new token hash and invalidates the previous bearer token. The subscription UI intentionally reveals the raw URL only in the response that generated or regenerated it.

The subscription utility is intentionally secondary to the calendar: admin and student pages render the calendar first and expose the utility through a native `<details>/<summary>` disclosure closed by default. Opening it reveals the private-link warning, labeled URL/copy control, rotation action and concise external-client instructions. Disclosure state is not persisted in D1.

## iCalendar projection

The serializer emits CRLF-terminated RFC 5545-style output with:

- `VERSION:2.0`, `PRODID`, `CALSCALE:GREGORIAN` and a stable calendar name;
- one timed `VEVENT` per current lesson;
- stable `UID:<lesson-id>@foxtutor.org`;
- UTC `DTSTAMP`, `LAST-MODIFIED`, `DTSTART` and `DTEND`;
- `STATUS:CONFIRMED` for scheduled/completed lessons and `STATUS:CANCELLED` for cancelled lessons;
- concise role-specific summaries and descriptions;
- only validated HTTPS lesson URLs;
- iCalendar text escaping and 75-octet UTF-8 line folding.

Completed lessons remain `CONFIRMED` because iCalendar VEVENT `STATUS` has no completed value; the event description contains the Learn status. Cancelled lessons remain present under their stable UID so clients can process the state change.

The feed includes the previous 90 days and next 365 days. It contains no recurrence rules, all-day events or private lesson notes. External clients control subscription refresh timing; Learn cannot force an immediate refresh.

## HTTP boundary

The route returns `text/calendar; charset=utf-8`, `Content-Disposition: inline`, `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` and the existing private response protections. It is read-only and never uses shared public caching.

Production uses a separate, more-specific Cloudflare Access application for `/learn/calendar/feed/*` with a `Bypass` policy for `Everyone`. This lets calendar clients fetch the feed without interactive Access while the Worker still requires the high-entropy bearer token and server-side ownership check. The normal `/learn/*` application, sessions and mutations remain behind the existing Access and Learn authorization boundaries. This control-plane change is not represented in Wrangler source; its deployed details are recorded in `docs/deployment/phase-2.5.md`.
