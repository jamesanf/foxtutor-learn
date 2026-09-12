# Phase 2.1 testing

## Automated checks

The Phase 2.1 suite adds:

- migration contract checks for `students`, `lessons`, foreign keys, lifecycle constraints and indexes;
- timezone-safe UTC conversion and round-trip display tests;
- invalid timezone, reversed interval and unsafe URL validation tests;
- explicit lifecycle transition tests;
- SQL ownership tests proving lesson reads join the authenticated Learn user before returning data;
- deterministic overlap predicate tests.

Run the repository checks from the Learn repository:

```sh
npm test
npm run build
npm run check
npm run test:browser
npm run test:production
```

## Local D1 and HTTP smoke flow

Apply both forward-only migrations to an isolated local database, seed only controlled local identities, and start the local Worker:

```sh
npx wrangler d1 migrations apply foxtutor-learn-local --local --persist-to /tmp/foxtutor-learn-phase21 --config wrangler.local.jsonc
npx wrangler dev --config wrangler.local.jsonc --persist-to /tmp/foxtutor-learn-phase21 --port 8787
```

With `X-Learn-Test-Identity` set only in local mode, verify:

- no identity returns `401`;
- an admin reaches `/learn/admin` and can submit student/lesson forms with the CSRF token;
- a student reaches `/learn/student/lessons`;
- a student’s own lesson detail returns `200`;
- another student’s lesson detail returns the generic `404`;
- a student requesting `/learn/admin` returns `403`;
- student HTML contains no admin notes or other student lesson identifiers;
- lesson create persists UTC instants, timezone, notes and HTTPS URL;
- scheduled-to-completed/cancelled transitions work and terminal transitions are rejected.

Do not use production D1 for local tests. Do not seed real student data into the local fixture.

## Privacy regression

Private responses retain `no-store`, `X-Robots-Tag`, CSP and the HTML noindex metadata. Public routes and the public sitemap remain outside the Learn Worker route patterns. Student notes are not selected by student-facing queries and are not logged.
