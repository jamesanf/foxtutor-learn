# Phase 2.7 calendar dependency and rendering decision

Date: 2026-09-12  
Status: local implementation complete; production acceptance pending

## Decision

Use FullCalendar Standard `6.1.21` with:

- `@fullcalendar/core@6.1.21` — MIT
- `@fullcalendar/daygrid@6.1.21` — MIT

The day-grid plugin supplies the required `dayGridMonth` default and `dayGridWeek` secondary view. No Premium/Scheduler package, license key, hosted service or CDN asset is used. `@fullcalendar/timegrid` was evaluated but is not required for this low-volume lesson overview and was removed to keep the client smaller.

The current registry exposes the compatible Standard view plugins at `6.1.21`. The registry's `@fullcalendar/core@7.1.0` package has incompatible peer requirements and no matching `daygrid`/`timegrid@7.1.0` packages, so it was not adopted merely because v7 documentation exists.

## Candidates and tradeoffs

| Candidate | Decision | Reason |
| --- | --- | --- |
| Existing bespoke week renderer | Rejected | Required duplicated period math, navigation, event layout, overflow and responsive CSS; week-first UX did not fit the tutoring use case. |
| FullCalendar Standard day-grid | Selected | Mature conventional month/week UI, keyboard-accessible controls, normal overflow handling, local vanilla integration, MIT license and no server dependency. |
| React/Vue calendar wrapper | Rejected | Adds a framework and client architecture that the server-rendered Worker does not need. |
| FullCalendar Premium/Scheduler | Rejected | Unnecessary resource/timeline features and separate licensing are outside scope. |

The bundled client is approximately 187 KiB uncompressed and the Wrangler dry-run reports 64.11 KiB total asset upload (14.64 KiB gzip). The dependency tree adds only the two runtime calendar packages; esbuild is a development dependency used to produce the self-contained browser asset.

## Data flow and authorization

The Worker performs the existing role-scoped D1 query before rendering HTML:

- admin: `listLessons`, with all lesson rows joined to their student names;
- student: `listLessonsForUser`, enforcing the active linked student and `STUDENT` role predicates.

The server projects only `id`, UTC `start`, UTC `end`, canonical lesson `url`, concise role-appropriate `title`, status class and timezone metadata into the calendar element's JSON data attribute. Private notes, feed tokens, session tokens and unrelated student records are never sent to the calendar client. The client does not choose an owner, query D1 or authorize events.

Event URLs continue to use `/learn/admin/lessons/<id>` or `/learn/student/lessons/<id>`, so canonical server-side detail/edit authorization remains the source of truth.

## Rendering and timezone model

The application remains server-rendered HTML plus a bundled JavaScript enhancement. FullCalendar is initialized with `initialView: "dayGridMonth"` and `timeZone: "Europe/London"`. Navigation and Month/Week switching happen client-side over the already-authorized event set, avoiding a general-purpose event endpoint.

Lesson `start` and `end` values remain UTC instants from D1. The event title includes the lesson's stored IANA timezone-formatted time, while the calendar grid positions the instant in the existing Learn display timezone. This prevents the library from silently reinterpreting the authoritative lesson timestamp.

## UX and styling

FullCalendar owns one coherent toolbar containing Previous, Today, Next, the current period title and Month/Week controls. Month is the default. Events are concise linked entries with explicit status text and restrained status styling. The old per-day Add lesson links, empty-day messages and bespoke week grid were removed. Admin retains one heading-level Add lesson action; students have no creation control. The subscription disclosure remains below the calendar and closed by default.

The library's injected base styles are allowed by the existing `style-src 'unsafe-inline'` policy. FoxTutor-specific CSS controls surfaces, colors, focus visibility, today treatment, event status, overflow, spacing and phone-width toolbar/event sizing.

## Maintenance and fallback

The dependency is locally pinned by the lockfile, bundled into the existing Worker asset directory and has no runtime vendor connection. Future updates must keep `core` and `daygrid` on a compatible Standard release and re-run the Phase 2.7 acceptance matrix. If the dependency becomes unmaintained or incompatible, the fallback is to replace this isolated `src/client/learn.ts` integration with another MIT-licensed vanilla calendar while preserving the same server event projection, canonical lesson URLs, ownership queries and timezone model.
