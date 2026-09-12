# Phase 2.10 final tutoring workflow and information architecture

Date: 2026-09-12  
Status: local implementation and rendered browser review complete; production deployment and authenticated acceptance pending

## Calendar decision

The primary calendar is a weekly timetable because tutoring operations are time-oriented and lessons concentrate in the teaching day. The bundled FullCalendar Standard configuration is:

- `@fullcalendar/core@6.1.21`
- `@fullcalendar/daygrid@6.1.21`
- `@fullcalendar/timegrid@6.1.21`

The packages are pinned to one compatible release and are MIT licensed. Only Standard functionality is used. Premium Scheduler/resource views, hosted assets, CDN runtime dependencies, framework wrappers and a bespoke timetable engine remain outside the boundary.

The client defaults to `timeGridWeek` and exposes `dayGridMonth` as the only secondary view. The TimeGrid uses `slotMinTime: "09:00:00"`, `slotMaxTime: "21:00:00"`, `scrollTime: "09:00:00"`, 15-minute slots, one-hour labels and a bounded CSS viewport sized for the available screen. The server continues to provide a minimal already-authorized event projection; the browser never queries D1 or chooses an owner.

Events use the lesson's actual position as the primary time representation. Admin events show the student name and a concise local time range; student events show a neutral lesson label and time range. Timezone, notes and implementation status text are not repeated inside ordinary event labels. Existing scheduled/completed/cancelled color treatment remains available with text/accessible labels, and event clicks continue to canonical lesson routes.

## Admin information architecture

The primary admin navigation is:

```text
Dashboard
Calendar
Bookings
Students
Lessons
```

Dashboard is an at-a-glance surface: next lesson, upcoming booking count, active student count and a short upcoming preview. Calendar is the timetable and subscription utility. Bookings is optimized for the next scheduled lessons. Students remains the student-record surface. Lessons remains the broader lesson administration surface.

## Bookings query model

Bookings is not a second domain or database. It queries `lessons` joined to `students` with:

```sql
WHERE l.status = 'scheduled' AND l.start_at >= ?
ORDER BY l.start_at ASC, l.id ASC
LIMIT ? OFFSET ?
```

The count query uses the same future/scheduled predicate. The Worker validates `size` against `12`, `24` and `48`, falls back to `12` for invalid values, normalizes invalid pages to page one and clamps pages past the final page. Pagination is therefore server-side and query state is preserved in links. Completed and cancelled lessons are excluded from the normal upcoming list.

## Student identity model

The UI exposes one student email field. The email is the contact/login identity and is normalized before lookup. The Worker still requires an active `STUDENT` Learn user, rejects an account already linked to another student, and stores the explicit `students.learn_user_id` relationship. Email matching never grants authentication or ownership by itself.

## Lesson creation model

Create Lesson remains a server-rendered form with a responsive grid. Start is a native 24-hour `input[type="time"]` with `step="900"`. The client previews Start plus 55 minutes immediately, including midnight crossover, without requiring Date. The Worker recalculates the authoritative end instant using the selected IANA timezone and retains DST-gap, overlap, lifecycle, URL and authorization validation.

## Subscription and security boundary

The subscription utility remains below the calendar and collapsed on ordinary page loads. It retains the read-only private feed link, copy action, regeneration action and internal confirmation surface. Feed routes, token hashing/rotation/revocation, student ownership, Access protection, private headers, noindex metadata and UTC/IANA storage are unchanged.

## Responsive strategy

Desktop uses the timetable's natural seven-column TimeGrid and a single grouped toolbar. Tablet and mobile preserve the standard calendar surface and allow the component's controlled scrolling rather than replacing it with stacked day cards. Responsive table-card rules are scoped to `.table-wrap` so they cannot corrupt FullCalendar's internal tables. Dashboard summaries collapse to one column, Bookings rows become labeled stacked records, lesson forms stack to one column, and navigation remains in its existing contained horizontal mobile surface.
