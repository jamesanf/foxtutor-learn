# Phase 2.11 calendar and subscription remediation architecture

Date: 2026-09-12  
Status: local implementation complete; production deployment and authenticated production acceptance pending

## Root cause

The Phase 2.10 calendar host used `height: clamp(560px, calc(100vh - 230px), 760px)`. FullCalendar then expanded the Month grid to consume that host, producing five roughly 116px rows at 1440x900 even though the day frames only required 84px. The event parent colours were dark enough for their light backgrounds, but FullCalendar's `.fc-event-main` rendered the actual text as white, creating an unreadable white-on-pastel result.

The subscription markup also placed the link, warning, action form and confirmation in one flex stack. Hidden confirmation was structurally adjacent to the action rather than being a self-contained panel, which made the open state look improvised.

## Layout decisions

### Month

- Keep FullCalendar Standard `dayGridMonth`.
- Use `height: "auto"`, `expandRows: false` and `fixedWeekCount: false`.
- Let the grid use four, five or six rows according to the displayed month.
- Use a 60px desktop day-frame minimum and a 48px mobile minimum; content can expand the affected row.
- Use one-line `HH:MM Student` event content.
- Do not create an internal vertical scroll container.

### Week

- Keep `timeGridWeek` as the default view.
- Keep the operational range at 09:00–21:00 and open at 09:00.
- Use 30-minute visual slots while retaining quarter-hour lesson placement and quarter-hour lesson creation.
- Use intrinsic FullCalendar height rather than a giant host clamp.
- Render two concise lines: student/lesson label and local time range.

### Event colour system

All lesson states use saturated surfaces with white text inherited by `.fc-event-main`:

| Status | Background | Contrast with white |
| --- | --- | ---: |
| Scheduled | `#166534` | 7.13:1 |
| Completed | `#075985` | 7.56:1 |
| Cancelled | `#991b1b` | 8.31:1 |

Status remains available through the class, accessible label and structural event treatment; colour is not the only source of event meaning.

### Subscription

The expanded disclosure uses a real grid:

```text
subscription-content
└── subscription-panel
    ├── panel heading
    ├── link row
    ├── action row + warning
    └── self-contained confirmation
```

The link row becomes one column on mobile. Confirmation is hidden with `display: none` and contributes no layout height until opened. Confirmation buttons use intrinsic widths and a deliberate gap.

## Preserved boundaries

No D1 schema, feed token, feed ownership, Access, authorization, lesson projection or public-site architecture changed. FullCalendar remains Standard `6.1.21`; no Premium package, framework or bespoke grid was introduced.
