# Phase 2.9 UI composition and workflow architecture

Date: 2026-09-12  
Status: local implementation in progress; authenticated browser acceptance pending

## Boundary

Phase 2.9 corrects presentation and interaction composition only. FullCalendar Standard remains locally bundled at `@fullcalendar/core@6.1.21` and `@fullcalendar/daygrid@6.1.21`. Existing D1 lessons, server-authorized event projection, UTC instants, IANA timezones, overlap validation, student ownership, calendar feeds, Access protection and private response boundaries remain authoritative.

## Design system and composition

The existing FoxTutor Geist font, blue/cyan action palette, light surfaces, restrained borders and focus treatment remain the visual system. CSS adds an 8px spacing rhythm and uses clear surfaces, grid columns and progressive disclosure rather than shrinking every element. The calendar is presented inside one surface; its FullCalendar toolbar separates navigation, period title and view selection through the library's left/center/right groups. Month remains the default and Week remains secondary.

Previous and Next retain FullCalendar's semantic buttons and period-specific accessible labels. After each FullCalendar date/view update, the client replaces the library icon content with a small inline SVG chevron so the directional affordance is visible in the rendered control. No icon framework or Unicode symbol is introduced.

## Subscription utility

The calendar subscription remains below the calendar in a native disclosure closed by default. Its open state uses a dedicated read-only link field, adjacent Copy link action, grouped Generate/Generate new link action, concise invalidation warning and application-native `role="alertdialog"` confirmation with Cancel and Regenerate controls. Success is rendered as a short `role="status"` message. Raw tokens remain intentionally available only in the post-generation response and are never stored.

## Lesson creation workflow

Create Lesson uses a responsive two-column grid at desktop widths:

- Student spans the form width.
- Date and Start time share a row.
- Derived duration/end and the compact `Europe/London` context form a supporting row.
- Lesson link spans the form width.
- Notes remain behind Additional details.
- Cancel and the primary action align in one action row.

Start is a native 24-hour `input[type="time"]` with `step="900"`. The browser offers normal time-entry semantics rather than a generated option list; the Worker still validates quarter-hour values authoritatively. The client derives the displayed wall-clock End by adding 55 minutes to Start alone, so `16:00` immediately shows `16:55` and `23:15` shows `00:10` without requiring Date. The Worker remains authoritative for the actual timezone-aware UTC start/end instants, DST gaps, overlap protection, student state and authorization.

Edit Lesson retains its broader editable start/end/timezone workflow because it supports existing lesson corrections; the simplified native time input applies to standard creation.

## Responsive and accessibility strategy

At mobile widths the lesson grid becomes one column, subscription actions stack without touching, and the calendar surface retains readable cells and toolbar groups rather than scaling the desktop layout into illegibility. Inline SVG arrows are decorative because their buttons retain accessible labels; the time field has a visible label, 24-hour/15-minute supporting text and an announced output region. Native disclosure, buttons, links and form controls remain semantic and focus-visible.
