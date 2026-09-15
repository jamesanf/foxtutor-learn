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
- lesson, student, resource, recurring-series and reschedule tables;
- student upcoming-charge, credit-history and billing-history tables;
- billing-chain, invoice and credit detail tables.

At the narrow responsive breakpoint, table rows become labelled cards. The
same reduced horizontal spacing is retained between each label and value so
the mobile presentation remains compact without changing its information
hierarchy.

The Production FreeAgent contact-mapping action cell uses a shrinkable grid:
the Contact ID input takes the available width while the save and remove
buttons retain their 34px hit areas. This prevents either icon from leaving
the table at reduced desktop widths; the existing stacked form is retained
on narrow mobile layouts.

Table action cells use a centered, vertically middle-aligned treatment with no
default button top offset. This keeps controls such as recurring-series Pause
on the same horizontal line as the other row values.
