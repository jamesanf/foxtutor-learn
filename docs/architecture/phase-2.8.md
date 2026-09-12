# Phase 2.8 calendar and lesson UX architecture

Date: 2026-09-12  
Status: local implementation record; production acceptance pending

## Boundary

Phase 2.8 changes presentation and interaction only. FullCalendar Standard remains locally bundled at:

- `@fullcalendar/core@6.1.21`
- `@fullcalendar/daygrid@6.1.21`

Both packages are MIT licensed. No framework, CDN, Premium/Scheduler package, new service, calendar API, database or migration was introduced.

## Calendar rendering

The Worker continues to query lessons with the existing role-scoped D1 functions and projects only authorized event fields into server-rendered HTML. The vanilla client initializes FullCalendar with `dayGridMonth` as the default and `dayGridWeek` as the only secondary view. The existing standard FullCalendar toolbar owns Previous, Today, Next, title and Month/Week controls. Its standard chevron icon classes are retained and receive period-aware `aria-label` values after each date/view change.

Calendar styling reduces page padding, toolbar/button height, title size, cell minimum height, event padding and surrounding gaps. Events remain concise links to canonical role-specific lesson routes. Scheduled events use a short student/time label for admins; completed/cancelled events include their status text and retain status styling. Event labels also expose status through an accessible label/title. The client never queries D1 or selects an owner.

## Subscription utility

The subscription remains below the calendar in a native `<details>` disclosure and is closed on ordinary loads. The expanded utility contains the intentionally revealed private link, Copy, Generate/Generate new link, a concise invalidation warning and a short status message. Raw tokens are still never stored in D1 and are only rendered in the post-generation response.

Regeneration uses an application-native confirmation panel wired to the existing form. `alert`, `confirm` and `prompt` are not used. The server-side POST, CSRF validation, token hashing, rotation and feed ownership behavior remain unchanged.

## Lesson creation interaction

The standard create form is a compact server-rendered form:

1. Student
2. Date
3. Start time in 15-minute increments
4. Derived duration of 55 minutes and displayed end time
5. Optional HTTPS Lesson link
6. Collapsed Additional details for low-frequency Notes

The create form keeps `Europe/London` as a hidden, known context rather than a major editable choice. The Worker converts the selected local date/time through the existing IANA-aware conversion, derives the end as 55 elapsed minutes from the resulting UTC instant, and continues to validate student status, lifecycle, URL safety and overlap server-side. Edit forms preserve the existing editable start/end/timezone/notes domain capability.

The client preview mirrors the timezone conversion sufficiently for immediate feedback, while the Worker remains authoritative. DST gaps are rejected by the existing conversion function; the stored lesson still contains UTC `start_at`/`end_at` and the real IANA timezone.

## Responsive and accessibility strategy

Desktop receives a compact two-column create form. At narrow widths the grid stacks, subscription actions become full-width, link fields wrap safely and FullCalendar's toolbar stacks without horizontal overflow. Native buttons, links, disclosure and form controls remain semantic. Focus-visible styles, keyboard disclosure behavior, accessible calendar labels and inline `role="alert"`/`role="status"` feedback are preserved.

