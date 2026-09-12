# Phase 2.12 bookings, history and subscription workflow architecture

Date: 2026-09-13  
Status: deployed; authenticated production acceptance pending

## Information architecture

The admin sidebar communicates operational meaning:

```text
Dashboard
Calendar
Bookings
Past Lessons
Students
```

`Bookings` is the upcoming operational list. It queries the existing `lessons` table for `status = 'scheduled'` and `start_at > now`, ordered from earliest to latest. `Past Lessons` is the historical view at `/learn/admin/lessons`; it queries `status != 'scheduled' OR start_at <= now`, ordered from newest to oldest. Future scheduled lessons never appear in Past Lessons. No new lifecycle status, table or source of truth was introduced.

## Shared lesson-list presentation

Bookings and Past Lessons use the same server-rendered lesson-list presentation: Date, Time, Student, Duration, Status and View. The page-specific query supplies the rows, total, title, subtitle and empty state. Both lists use the same footer with:

- a concise `Showing start-end of total` result range;
- accessible Previous/Next links with disabled states;
- compressed page numbers for larger result sets;
- a labeled `Show per page` select with exactly `12`, `24` and `48`.

The default is 12. The page-size form always submits `page=1`; pagination links retain the selected size. Page and size are parsed and bounded server-side, with invalid sizes falling back to 12 and invalid pages falling back to page 1/clamping to the final page. D1 performs both the filtered count and the limited result query, so the browser never receives the complete lesson history.

## Calendar subscription regeneration

The existing secure POST flow remains authoritative: the Worker validates the active session and CSRF token, rotates the hash-only feed token, invalidates the previous token, and renders the newly generated URL. The regeneration action no longer uses a confirmation step. The action button itself is the explicit user confirmation. The existing token is invalidated immediately and replaced with a newly generated private feed URL.

The subscription copy names Apple Calendar, Google Calendar, Outlook and other iCalendar-compatible applications. Copy remains a client-side convenience and does not alter token security. No feed route, ownership predicate, D1 schema, Access policy or public-site boundary changed.

## Protected calendar subsystem

Phase 2.12 does not alter FullCalendar configuration, Week/Month sizing, event projection, event colours or calendar toolbar behavior. The only calendar changes are the subscription panel copy, button labels and removal of obsolete confirmation markup/client code.

## Database migration

**DATABASE MIGRATION: NONE REQUIRED**
