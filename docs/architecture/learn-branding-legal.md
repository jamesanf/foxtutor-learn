# Learn branding and legal boundary

The authenticated Learn shell keeps the public FoxTutor visual language while
remaining a separate private application. The left header label is `FoxTutor`;
the centered Learn mark is served from generated, transparent display assets
derived from `public/learn_logo.png`. The footer mirrors the public site's
James Fox, Bespoke English Tuition, contact and legal-link structure without
changing the public site repository.

`/learn/terms` and `/learn/privacy` are authenticated routes available to both
administrators and students. They are deliberately separate from the public
legal dialogs because Learn stores portal-only records: pupil and parent/carer
profiles, lessons, reports, resources, notifications, cancellation and
rescheduling history, billing-consequence classifications, sessions, audit
records and calendar-feed tokens. They explain that the public policies remain
relevant to public-site interactions and that the Learn notices supplement
those policies for the private portal.

Learn does not perform FreeAgent or other accounting synchronisation. Phase 5
stores an operational billing-consequence classification only; any accounting
integration remains a later boundary.
