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
