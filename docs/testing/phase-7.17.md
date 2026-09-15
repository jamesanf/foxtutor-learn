# Phase 7.17 testing and evidence

## Student dashboard

Automated UI contracts cover:

- next scheduled lesson and last lesson dashboard summaries;
- the right-hand home-learning panel;
- the `None available` state;
- the `Submit here` link;
- responsive dashboard panel layout;
- time-of-day greeting and first-name fallback;
- compact exclamatory greeting without the former supporting caption;
- red under-30-minute launch notice, with and without an external lesson URL.
- shared page-title alignment with the first sidebar navigation button.
- footer placement at the browser bottom for short dashboards, without excess
  whitespace, and normal document scrolling for longer dashboards.
- outline navigation icons for Resources and Notifications, with filled shapes
  when selected.
- shared compact table columns and responsive headers that wrap at word
  boundaries without splitting words.
- Production FreeAgent contact-mapping actions remaining inside their table
  cell at reduced desktop widths, with the mobile stacked form preserved.
- accounting page Production FreeAgent card spacing matching the page heading
  rhythm and the other cards on the page.
- 25% smaller main page titles across standard, calendar, resource-upload and
  billing-settings heading variants.
- recurring-series Pause/Resume controls starting at the Action header edge,
  remaining vertically aligned with the row, and using a compact 24px control
  height matching the adjacent status pill.
- the admin recurring-series table appearing below Upcoming Bookings, with no
  separate Recurring series navigation item.
- the embedded recurring-series table using standard result-range and
  previous/next pagination with independent `seriesPage` and `seriesSize`
  parameters, while Upcoming Bookings retains its own pagination.
- the Upcoming Bookings and embedded recurring-series sections using the same
  unboxed page surface and consistent vertical spacing.
- the Upcoming Bookings `New booking` trigger opening the house-style modal,
  preserving the lesson end-time preview and closing through Cancel, the close
  control or the backdrop.
- the admin Dashboard `New Booking` trigger opening the same booking chooser
  and standalone/recurring modal paths as the Bookings page, including the
  empty-upcoming-bookings state.
- the modal booking chooser exposing separate `Standalone lesson` and
  `Recurring lesson` paths, with Back returning to the chooser and the
  recurring path rendering the complete series form.
- the legacy `/learn/admin/series/new` GET path redirecting to Bookings with
  the recurring modal view preselected.
- mobile table pages retaining real columns in a horizontal scrolling
  container instead of converting rows into unusable stacked cards.
- notification delivery-log headers sorting the server-side result set, with
  sent time descending as the default and a ten-page cap for each page size.
- scheduled notification cleanup retaining the latest 480 completed records
  while preserving active and unresolved delivery states.
- standalone booking conflict checks covering exact overlap, cancelled lessons,
  boundary-touching intervals and cross-student tutor schedule clashes;
- conflict messages identifying the existing student's name, booking type,
  date and time;
- recurring-series preflight checks across the bounded six-week
  Europe/London materialisation window, including existing materialised
  lessons, deterministic first-conflict selection and DST-safe occurrence
  calculation;
- recurring resume and scheduled materialisation guards that leave the series
  paused or cancelled rather than silently creating an overlapping lesson.
- the New Booking modal Back controls using an accessible, borderless bold
  MDI-style arrow in both booking form paths.
- both New Booking student fields using the internal searchable combobox,
  including live filtering, keyboard selection, hidden ID submission and
  invalid free-text rejection.
- the embedded recurring-series section omitting its redundant `Create series`
  action because creation is owned by the shared New Booking modal.
- every admin booking entry point, including Calendar, using the `Create
  Booking` trigger and shared standalone/recurring modal tree, with no
  remaining `Add lesson` action.
- invoice detail using the human/provider reference as its primary identifier,
  with the internal invoice ID retained only as a secondary operational field;
- short date-sequential provider invoice references using
  `FT-INV-YYMMDDNN`, with a collision-safe daily sequence from `01` through
  `99`; legacy UUID references remain a read-only lookup fallback.

Table-page coverage includes the Accounting outbox and contact mappings,
notification log, lesson/student/resource lists, recurring series,
reschedules, billing health, invoice/credit detail and student billing
tables. The shared CSS contract is exercised once because every listed page
uses the same `.table-wrap`, `table`, `th` and `td` rules.

The dashboard reads only the authenticated student's own upcoming and past
lessons. The home-learning task is taken from the latest sent report, not a
draft report.

## Student submission route

Automated authorization and UI contracts cover the new
`student-lesson-submit` route and the lesson-scoped submission form. The
implementation reuses the resource upload validation path and disables the
student's own resource-added notification.

The route must remain protected by:

```text
active STUDENT session
→ findLessonForUser ownership predicate
→ sent-report/task availability check
→ CSRF validation
→ validated private resource upload
```

## Logout acceptance

Logout is a CSRF-protected `POST /learn/logout`. It deletes the user's D1
application sessions and clears the Learn session cookies. Because the
upstream identity provider can remain authenticated, the response also sets a
short-lived signed-out marker. The redirect must show a signed-out page rather
than immediately creating a new Learn session. The explicit `Sign in again`
link must provision a fresh session and clear the marker.

## Automated result

The complete suite passes:

```text
42 test files
305 tests
305 passed
0 failed
```

The latest billing-reference and invoice-detail regression tests cover the
normalised identifier presentation, date formatting, and the `01`/`99`
sequence boundaries. Existing provider invoices remain idempotent and are not
recreated when the reference-format code changes; retries search both the new
date-sequential reference and the prior UUID reference.

Live Chromium and Production FreeAgent acceptance created a James Fox lesson
for 30 September 2026. FreeAgent displayed invoice `94628424` with reference
`FT-INV-26091501`, total £55.00 and status Open. FoxTutor recorded the
Production invoice as SENT with a successful provider operation and a
collection date seven days before the lesson.

New provider invoices use the lesson date as their invoice date and include a
visible line-item note stating the scheduled Direct Debit collection date.

The issuance scheduler now waits until 22:00 Europe/London on the calendar
date seven days before the lesson. At 21:59 local time no invoice is selected;
at 22:00 it becomes eligible. The scheduler processes invoice creation before
creating and processing the Direct Debit operation, so a successfully sent
invoice can enter collection in the same scheduled invocation. A lesson
cancelled before the cutoff remains provider-uninvoiced and cannot enter
collection.

Provider cancellation is now an explicit `CANCEL_INVOICE` operation. When a
sent invoice has no collection operation or payment in progress, cancellation
calls FreeAgent's `mark_as_cancelled` API transition and requires a confirmed
provider response. If collection has started, FoxTutor blocks invoice
cancellation and preserves the payment/credit lifecycle. Provider-not-found
or ambiguous responses remain reconciliation-required rather than being
treated as successful cancellation.

Settlement-safe credit and cancellation acceptance now also covers:

- admin and recurring cancellation credits are created only when a persisted
  Direct Debit/payment operation is scheduled, submitted, pending, confirmed,
  failed or unknown; an unissued or merely sent invoice creates no credit;
- sent, uncollected invoices remain local `SENT` documents while their
  `CANCEL_INVOICE` provider operation is pending, preventing a false
  customer-facing claim that the provider has already cancelled the invoice;
- cancellation emails distinguish not invoiced, provider-cancellation
  pending, payment in transit, confirmed credit and reconciliation-required
  outcomes;
- credit-covered lessons create an idempotent FoxMail billing statement from
  `billing@foxtutor.org` with a normalized `FT-INV-YYMMDDNN` reference,
  lesson date, source-invoice reference and £0.00 amount due. They are marked
  locally secured only after mail acceptance and never receive a FreeAgent
  invoice or Direct Debit operation;
- no-mandate lessons are explicitly classified as
  `NO_MANDATE_MANUAL_PAYMENT`, leaving the lesson bookable while warning the
  tutor that manual payment is required;
- active credit is separated from consumed history in the student and admin
  billing views.
- zero-value credit-covered statements use only normalized `FT-INV-YYMMDDNN`
  source references, never internal credit IDs, and contain no bank details or
  payment instructions;
- cancelling a credit-covered FoxMail statement reverses the original credit
  ledger application exactly once and does not queue a provider-document
  cancellation because no FreeAgent document exists;
- recurring cancellation uses the same zero-value credit reversal rule;
- credit-covered statements identify the destination lesson and, when source
  metadata exists, the originating normalized invoice and lesson date;
- cancellation notifications identify when a restored credit came from an
  originating invoice and lesson rather than treating the zero-value follow-up
  statement as a new source;
- administrators can record an externally processed refund against the
  remaining credit balance with an external refund reference; the immutable
  `REFUND` ledger entry removes only the refunded amount and cannot exceed the
  available balance;
- failed collection outcomes are reported as billing review required, with no
  credit grant and no false claim that the lesson was unpaid or unbilled.

Production D1 migration `0034_settlement_safe_credit_repair.sql` repaired the
historical test grants that had no provider invoice/payment evidence. It uses
ledger `REVERSAL` plus a marked `REFUND` repair transaction rather than
deleting rows; each repaired credit now has zero remaining balance and status
`FAILED` for audit visibility.

Live acceptance on 15 September 2026 created a James Fox lesson for 7 October
2026 through the authenticated admin booking flow. Its billing event remained
`PENDING` with a 30 September collection date and no billing invoice. The
lesson was then cancelled through the admin lesson status flow. Production D1
confirmed the lesson and billing event became `cancelled`/`CANCELLED`, with no
invoice and no provider operation.

The two explicitly supplied FreeAgent test invoices were processed in the
authenticated provider session. FreeAgent required each Open invoice to be
moved to Draft and then deleted; it does not expose a separate cancellation
status for this flow. FreeAgent confirmed deletion of invoice IDs `94628424`
and `94627880`. FoxTutor reconciliation subsequently recorded both local
invoices as `UNKNOWN` with provider status `NOT_FOUND`, marked their billing
events `UNKNOWN` with `RECONCILIATION_REQUIRED`, and raised two ERROR
reconciliation alerts. This fail-closed result is intentional: an externally
deleted invoice is not silently treated as paid or cancelled while its lesson
remains scheduled.

The TypeScript check and client build also pass. The final automated suite
after the FoxMail cancellation/provenance fix is:

```text
43 test files
312 tests
312 passed
0 failed
```

The focused regression test confirms that a `CREDIT_COVERED_EMAIL` settlement
creates exactly one idempotent ledger reversal and no `CANCEL_INVOICE`
operation. The admin credit detail now exposes a guarded manual-refund flow;
it requires an explicit confirmation and external refund reference, then
records the refund as `PAID`/`REFUNDED` in the credit ledger. Authenticated
Chromium proved the full controlled refund flow for
`credit:phase717-statement-v4`: the admin form accepted the external reference,
the browser redirected successfully, and Production D1 showed a `PAID` refund,
`REFUND` ledger entry, and zero remaining balance. No real-money refund was
initiated.

## Traffic-light closure matrix

| Area | Status | Evidence or remaining decision |
| --- | --- | --- |
| Cancellation before invoice issuance | GREEN | Live admin cancellation left no invoice, collection operation or credit. |
| Sent but uncollected provider invoice | GREEN | `CANCEL_INVOICE` is idempotent and fail-closed until FreeAgent confirms cancellation. |
| Collection started, failed or unknown | GREEN | Cancellation does not delete the provider document; reconciliation is required. |
| Credit-covered FoxMail statement | GREEN | Live statement/cancellation tests preserve the original invoice and lesson provenance. |
| Repeated credit reversal | GREEN | Idempotent reversal prevents a second credit grant. |
| Manual refund acknowledgement | GREEN | Live Chromium/D1 test records one `PAID` refund and zero available balance. |
| Partial manual refund | AMBER | Database helpers support bounded partial refunds, but a separate live partial-refund fixture has not been run. |
| New-customer no-mandate payment | AMBER | Manual-payment readiness is classified safely; live mailbox/provider onboarding remains a separate acceptance gate. |
| Full live recurring provenance cycle | AMBER | Single-lesson provenance is proven; a fresh recurring-series mail cycle still requires an isolated provider fixture. |
