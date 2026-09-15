# Learn table presentation

Learn uses one shared table presentation for administrator and student pages.
Table cells use compact horizontal padding so wider column content remains
visible without creating unnecessary gaps between columns.

Table headers use responsive `clamp()` sizing and wrap only at natural word
boundaries. Long single-word values in data cells may still use the existing
safe overflow wrapping, while headers do not split words or use automatic
hyphenation.

The shared rules apply to:

- accounting outbox, contact mappings and billing tables;
- notification logs;
- lesson, student, resource, recurring-series and reschedule tables. The admin
  recurring-series table is presented below the upcoming Bookings table and
  uses independent `seriesPage` and `seriesSize` pagination parameters;
- student upcoming-charge, credit-history and billing-history tables;
- billing-chain, invoice and credit detail tables.

At the narrow responsive breakpoint, tables remain real tables inside a
horizontal scrolling container. Headers, rows, column alignment and action
controls are preserved rather than being converted into stacked cards. Tables
use their intrinsic readable width, with a `min-width` of the viewport so
short tables do not create unnecessary scrolling.

The Production FreeAgent contact-mapping action cell uses a shrinkable grid:
the Contact ID input takes the available width while the save and remove
buttons retain their 34px hit areas. This prevents either icon from leaving
the table at reduced desktop widths; the existing stacked form is retained
on narrow mobile layouts.

Table action cells use a vertically middle-aligned treatment with no default
button top offset. Recurring-series actions begin at the same padded edge as
the Action header and use a compact 24px variant so their visual height matches
the adjacent status pill.

Recurring-series rows are queried with a deterministic status/date/id order and
database-level limit and offset. The standard result range, previous/next
controls and page-size selector appear below the embedded table without
changing Upcoming Bookings pagination.
