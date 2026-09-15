# Learn branding and legal boundary

The authenticated Learn shell keeps the public FoxTutor visual language while
remaining a separate private application. The left header label is `FoxTutor`;
the centered Learn mark is served from generated, transparent display assets
derived from `public/learn_logo.png`, inside a white rounded panel so it remains
clear against the dark header. The centered mark uses a 105px by 48px panel
with a 90px display width on desktop, and the topbar contracts to a 64px
minimum height; the mobile breakpoint scales the mark and bar down further.
The footer uses a compact two-row layout on each side of the centered logo.
The left side shows bold `FoxTutor` followed by `Bespoke English Tuition` on
the first row, with the copyright notice below. The right side keeps the
contact address above a same-line `Terms & Conditions` and `Privacy Policy`
pair. This preserves the public site's contact and legal-link structure
without changing the public site repository.

The Resources and Notifications navigation icons use outline strokes by
default, matching the other navigation icon treatment, and switch to a filled
shape when their navigation item is selected. The selected item is marked with
`aria-current="page"` for both visual state and accessibility.

`/learn/terms` and `/learn/privacy` are authenticated routes available to both
administrators and students. Their visible legal content is an exact HTML
mirror of the canonical public-site source:

- Public canonical source: `foxtutor/src/config/legal.tsx` in
  `jamesanf/foxtutor`.
- Learn generated mirror: `src/legal.ts` in
  `jamesanf/foxtutor-learn`.
- Local commands: `npm run sync:legal` and `npm run check:legal`.
- Release guard: `npm run check` runs the mirror check before the Worker
  dry-run, so a Learn release cannot pass its normal release check with stale
  legal content.

This repository deliberately does not maintain a second portal-specific legal
policy. The legal source remains in the main platform; Learn's extra
operational data handling is implemented through the application's security
controls and data model rather than by silently changing the published terms.
