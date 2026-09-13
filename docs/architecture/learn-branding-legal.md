# Learn branding and legal boundary

The authenticated Learn shell keeps the public FoxTutor visual language while
remaining a separate private application. The left header label is `FoxTutor`;
the centered Learn mark is served from generated, transparent display assets
derived from `public/learn_logo.png`, inside a white rounded panel so it remains
clear against the dark header. The footer mirrors the public site's James Fox,
Bespoke English Tuition, contact and legal-link structure without changing the
public site repository.

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
