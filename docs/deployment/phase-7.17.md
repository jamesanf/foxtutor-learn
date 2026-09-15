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
Recurring-series Pause/Resume controls now use a compact 30px action style,
with flex-centered forms so the button text aligns vertically with the rest of
the table row.
The compact rule is declared after the shared button rule so its height,
padding and line-height cannot be overridden by the global button defaults.
The control height is now 24px to match the adjacent status pill.
The action form now starts at the same padded left edge as the `Action`
column header instead of centering the button within the column.
Admin recurring-series management now appears directly below Upcoming
Bookings. The standalone Recurring series navigation item has been removed,
while legacy `/learn/admin/series` links redirect to Bookings and the existing
create, pause and resume actions remain available.
The embedded recurring-series table now uses a database-level page query and
the standard result-range, navigation and page-size controls. Its
`seriesPage` and `seriesSize` parameters remain independent from Upcoming
Bookings pagination.
Upcoming Bookings and the embedded recurring-series section now use the same
unboxed surface, with matching section spacing.
The Upcoming Bookings action is now labelled `New Booking` and opens the
existing house-style modal dialog. The dialog reuses the server-side lesson
creation route, retains the end-time preview, and supports keyboard focus
return plus Cancel, close-control and backdrop dismissal.
The New booking dialog now presents `Standalone lesson` and `Recurring lesson`
choices. Each path has its existing protected form and server route, and the
legacy recurring-series creation URL redirects to Bookings with the recurring
form selected in the modal.
The admin Dashboard now uses the same `New Booking` trigger and modal tree,
including when there are no upcoming bookings.
Standalone booking creation now checks the complete tutor schedule before
inserting a lesson and reports the conflicting student's name, booking type,
date and time. Recurring creation preflights every occurrence in the bounded
six-week Europe/London materialisation window before persisting the series.
Resume and later materialisation perform the same check and refuse to create
an occupied occurrence rather than silently overlapping an existing booking.
The New Booking modal now uses a borderless bold back-arrow icon in the
standalone and recurring form views while retaining an accessible label and
the existing chooser navigation.
Both booking forms now label the payer selector simply as `Student` and use a
shared site-internal searchable combobox with live suggestions. The selected
student ID continues to be submitted through the existing protected routes.
The embedded recurring-series section no longer shows a separate `Create
series` link; the shared New Booking modal is now its only creation entry
point.
Calendar now renders the same Create Booking modal tree as Dashboard and
Bookings. All admin creation triggers use `Create Booking`; the old Add lesson
calendar link has been removed.
Invoice detail now leads with the human/provider reference instead of the
internal UUID-style invoice ID, while retaining that internal ID as a
secondary operational field. New provider references use the short
date-sequential `FT-INV-YYMMDDNN` format. A D1-backed unique sequence table
allocates each daily number once, and retries also search the prior UUID
reference so existing provider invoices cannot be duplicated.
The FreeAgent invoice date is the lesson date, and the visible invoice
description states that Direct Debit collection is scheduled seven days
earlier.
Pending lesson events are not sent to FreeAgent before 22:00
Europe/London on their collection date; the scheduler therefore gives the
admin the seven-day cancellation window. Invoice creation is processed before
Direct Debit operation creation, and the newly created Direct Debit operation
is processed again in the same scheduled invocation.

Migration `0033_cancel_invoice_operation.sql` adds the idempotent
`CANCEL_INVOICE` operation. A sent invoice is cancelled through FreeAgent's
API transition only when no collection operation or payment has started.
Collection-started invoices are never deleted or cancelled; ambiguous provider
results remain `UNKNOWN`/`RECONCILIATION_REQUIRED`.

Migration `0034_settlement_safe_credit_repair.sql` is applied in Production.
It voids historical cancellation grants without provider invoice/payment
evidence through auditable ledger reversal/refund rows, leaving no remaining
usable balance while retaining the original grant and consumption history.
The Worker now gates new credits on collection/payment evidence, renders
provider-aware cancellation outcomes, creates auditable FoxMail billing
statements for fully credit-covered lessons, and labels no-mandate lessons as
manual payment rather than treating them as Direct Debit-pending.

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
- standalone and recurring New Booking conflict notifications, including
  cross-student clashes and the no-mutation result for a rejected recurring
  creation;
- recurring resume remaining paused when a newly occupied occurrence is
  detected.
- the tested invoice detail showing provider reference `94627880` as the
  primary identifier, with the internal invoice ID secondary;
- no duplicate provider invoice when an existing billing operation is
  reprocessed after the reference-format change, including legacy-reference
  lookup.
- live Production FreeAgent showing invoice `94628424` as
  `FT-INV-26091501`, with the FoxTutor collection date seven days before the
  30 September lesson.

No early Production payment, Direct Debit, credit note, bank transaction or
£1 test is part of this feature. The verified £55 invoice remains scheduled
for its normal collection date.

## Deployment provenance

- Git commit: `2770dfc`
- Worker: `foxtutor-learn`
- Worker version: `6826eb38-5bb9-4028-bfb7-a043996900c4`
- Routes: `foxtutor.org/learn` and `foxtutor.org/learn/*`
- Deployment completed on 2026-09-15. The unauthenticated endpoint smoke test
  correctly reached the Cloudflare Access login boundary. Authenticated
  Chromium logout acceptance remains a human-session check.
- Live cancellation acceptance confirmed that provider deletion is quarantined
  as `NOT_FOUND`/`RECONCILIATION_REQUIRED`, while a FoxTutor lesson cancelled
  before issuance leaves no invoice or collection operation. The deployed
  application now uses the FreeAgent cancellation API for future sent-invoice
  cancellations rather than relying on browser deletion.
- Production D1 migration `0033_cancel_invoice_operation.sql` is applied. The
  authenticated Chromium billing dashboard rendered successfully after the
  deployment; the only observed console errors were pre-existing CSP blocks for
  inline Access/font/manifest resources, not application JavaScript errors.
- Production D1 migration `0034_settlement_safe_credit_repair.sql` is applied.
- Production verification found nine historical test credits with no provider
  invoice/payment evidence; all now have zero remaining balance and an
  `INTERNAL_REPAIR_VOID` ledger marker.
- The earlier deployment provenance entries above are historical; the current
  deployed revision is `2770dfc` / Worker version
  `429ff267-94ad-4b95-9bf0-169a9e8dbd02`.
- Live authenticated Chromium reload of `/learn/admin/billing` confirmed the
  deployed settlement-safe UI: no active customer credits, nine consumed
  historical credits, `Billing audit` links, `Record manual-payment exception`
  actions, and no application errors in the rendered page.

The follow-up zero-value billing hardening does not create a FreeAgent
document. Live authenticated testing showed that FreeAgent renders the
company-wide bank details even when `bank_account: null` is supplied, so a
provider £0 invoice is not safe for this use. FoxTutor now sends an idempotent
customer billing statement through FoxMail from `billing@foxtutor.org`,
using a normalized `FT-INV-YYMMDDNN` reference, the lesson date and a £0.00
amount due. The statement contains no bank details or payment instructions;
internal credit identifiers are never emitted.

The local invoice and billing event become settled only after FoxMail accepts
the message. A rejected, timed-out or ambiguous mail result fails closed,
records the billing operation outcome and reverses the credit allocation so a
retry cannot strand the customer's balance. The mail idempotency key prevents
duplicate statements when a provider accepted a request but the Worker did
not receive a definitive response.

Cancelling a credit-covered FoxMail statement now reverses the original credit
application through the immutable ledger exactly once. Because the statement
is not a FreeAgent document, no provider-document cancellation is queued.
Recurring cancellation uses the same rule. The statement identifies the
destination lesson and the originating normalized invoice and lesson date when
that source metadata exists; cancellation notices preserve that original
provenance. Failed collection is classified separately from an unissued
invoice, never creates credit, and produces a billing-review message.
The admin credit detail now provides a guarded manual-refund acknowledgement:
the administrator enters the amount already refunded externally and its
external reference, and FoxTutor records an auditable `REFUND` transaction
without initiating money movement.

Billing alert actions now decode and validate their structured
`billing-alert:...` identifiers directly. Acknowledging an alert records that
it has been seen and leaves it open for reconciliation; resolving it is a
separate action after the provider state is confirmed. This fixes the prior
`Invalid alert action` response for reconciliation alert IDs.

Recurring cancellation stress acceptance has also been completed for a
controlled five-occurrence series. A midpoint single-occurrence cancellation
and cancellation of the remaining occurrences through the authenticated
admin lesson-status UI left every billing event `CANCELLED`, created no
FreeAgent document or provider operation, and delivered five accepted
cancellation notifications. The recurring `THIS_AND_FUTURE` path is covered
by automated tests, including the fail-closed rule that collection-started
invoices are not marked `CANCELLATION_PENDING`.

The New Booking modal alignment fix was deployed in commit `51493e4`
(Worker version `720a88e3-1e23-47d3-a789-4d552e40c666`). Authenticated
Chromium acceptance on `/learn/admin/bookings` verified both standalone and
recurring form views: the Back arrow and close control each render at
32px × 32px, use the same muted colour, share the same 12px top offset, and
remain separated by matching 14px inset values. The form heading remains
below the controls, and closing the modal removes its open state.

The admin navigation label for the accounting area is now `Billing`. Existing
`/learn/admin/accounting` routes, FreeAgent OAuth callbacks and accounting
provider internals remain unchanged. The Billing page heading and active
navigation state use the new label.
