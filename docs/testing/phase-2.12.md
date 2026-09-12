# Phase 2.12 workflow acceptance record

Date: 2026-09-13  
Status: local implementation in progress; deployment and production acceptance pending

## Information architecture

- Admin navigation is Dashboard, Calendar, Bookings, Past Lessons, Students.
- `/learn/admin/bookings` is the canonical upcoming list.
- `/learn/admin/lessons` remains the stable historical route and is presented as Past Lessons.
- Student navigation and ownership queries are unchanged.

## Query contracts

Bookings:

```text
status = scheduled
start_at > now
ORDER BY start_at ASC, id ASC
```

Past Lessons:

```text
status != scheduled OR start_at <= now
ORDER BY start_at DESC, id DESC
```

Both queries use D1 `LIMIT` and `OFFSET` bindings and a matching filtered count query. There is no client-side full-history payload.

## Pagination

- Default page size: 12.
- Supported page sizes: 12, 24 and 48 only.
- Invalid `size` values fall back to 12.
- Invalid or missing `page` values fall back to 1.
- Out-of-range pages clamp to the last page.
- Changing page size submits page 1.
- Pagination links retain page size.
- Footer uses `Showing start-end of total`, accessible navigation, current-page indication and disabled Previous/Next states.
- Page numbers are compressed for large result sets; the footer remains usable at mobile widths.

Controlled test data should cover 0, 1, 12, 13, 24, 25, 48, 49 and 90 records for both filtered views. For each case verify row count, total count, page count, disabled states, newest/earliest ordering and all page-size transitions.

## Subscription regeneration

The acceptance sequence is:

1. Generate a first link and retain URL A.
2. Click `Regenerate calendar link` once.
3. Assert the new URL B is displayed immediately with Copy available.
4. Assert `Calendar link regenerated.` is visible.
5. Assert no confirmation panel, Cancel control or second regeneration activation appears.
6. Request URL A and verify the feed is unavailable.
7. Request URL B and verify the feed works and contains the expected lesson projection.

The instructional copy must identify Apple Calendar, Google Calendar and Outlook. The existing hash-only token storage, owner predicates, revocation and feed response behavior remain covered by the existing security tests.

## Regression gates

Run:

```text
npm test
npm run build
npm run check
npm run test:browser
npm run test:production
git diff --check
```

Focused browser review covers 1440x900, 1024x768, 820px and 390x844 for navigation, Bookings, Past Lessons, pagination, page-size changes and the subscription panel. Calendar review is limited to Week/Month usability and sizing regression; no new calendar redesign is in scope. Authenticated production review must verify admin-only list access, student isolation, feed invalidation and unchanged public-site boundaries.

