# Phase 7.17 deployment record

## Scope

This deployment contains the balanced student dashboard cards, time-of-day
greeting, near-term lesson launch notice, home-learning panel, secured
lesson-scoped student submission route, logout-session repair and compact
Learn header branding. It also uses outlined Resources and Notifications
navigation icons when unselected, with filled selected states, and the compact
two-row footer layout. Student dashboard calendar and resource actions are
full-width and aligned to the panel copy. The student dashboard now also
keeps a viewport-height minimum so the footer sits at the browser bottom when
the content is short and normal scrolling takes over when it is long.
The submission flow reuses the existing private resource/R2 pipeline and
the logout repair does not change billing or provider behavior.
Shared content spacing now aligns every page title with the top of the first
sidebar navigation button, including the student dashboard greeting.
The Learn shell now uses a flex column layout so short student dashboards
place the footer at the browser bottom without an extra viewport-sized content
row, while longer dashboards continue to scroll naturally.
The Calendar, Bookings and Past Lessons navigation icons retain their filled
appearance. The earlier experimental outline treatment was rolled back after
visual review; Resources and Notifications remain outline by default and
filled when selected.
All Learn tables now use compact horizontal cell spacing and responsive
headers that shrink dynamically and wrap only at natural word boundaries.
Production FreeAgent contact-mapping actions now use a shrinkable input grid
so the save and remove icons remain inside their table cell at reduced desktop
widths, while retaining the stacked mobile form.
The first Production FreeAgent connection card no longer applies the generic
card top margin in addition to the page-heading bottom margin, so its spacing
matches the other Accounting page content blocks.
Main page titles are now 25% smaller across the shared, calendar,
resource-upload and billing-settings heading variants.
Recurring-series table action cells now center Pause/Resume controls and remove
the generic button top offset, keeping the controls aligned with row values.
At mobile widths, all Learn tables now remain real horizontally scrollable
tables instead of becoming stacked card layouts that obscure column context.
Redundant page subtitles have been removed from Accounting, Notifications,
resource upload, billing and billing-audit headings so page titles carry the
interface without restating their purpose.
Notification delivery-log headers now sort by event, recipient, pupil, lesson,
status, scheduled time, sent time or created time, defaulting to sent time
descending. The visible log is capped at ten pages for the selected page size,
and the scheduled Worker retains the latest 480 completed records while
preserving active or unresolved deliveries.

## Required validation

```text
npm test
npm run build
npm run check:legal
npx wrangler deploy --dry-run --config wrangler.jsonc
```

The final deployed revision and Worker version are recorded below after the
production deployment completes.

## Acceptance boundary

Authenticated Chromium should verify:

- the next and last lesson cards;
- the time-of-day greeting and pupil first-name fallback;
- equal card widths across both dashboard rows;
- the red under-30-minute notice with and without a lesson URL;
- the home-learning task and `None available` state;
- the `Submit here` navigation;
- a successful student upload;
- student ownership isolation for another student's lesson submission URL.
- the logout POST, signed-out landing page and explicit resume link.
- the reduced centered Learn mark and contracted header bar at desktop and
  mobile widths.

No Production invoice, payment, Direct Debit, credit note, bank transaction or
£1 test is part of this feature.

## Deployment provenance

- Git commit: `c38ef12`
- Worker: `foxtutor-learn`
- Worker version: `84bfaf0b-cf56-4f40-9826-1076e13905e4`
- Routes: `foxtutor.org/learn` and `foxtutor.org/learn/*`
- Deployment completed on 2026-09-15. The unauthenticated endpoint smoke test
  correctly reached the Cloudflare Access login boundary. Authenticated
  Chromium logout acceptance remains a human-session check.
