# Phase 3.1 resource testing

Date: 2026-09-13

## Automated gates

The following local gates pass after the resource implementation:

```text
npm test
npm run build
npm run check
npx wrangler d1 migrations apply foxtutor-learn-local --local --persist-to /tmp/foxtutor-learn-resource-check --config wrangler.local.jsonc
git diff --check
```

The clean local D1 migration applies `0001_foundation.sql` through `0004_resources.sql`. The resource migration contract, route classification and admin/student role boundaries are covered by the integration and unit suites.

## Required authenticated acceptance

Production authenticated browser acceptance remains a human gate because this environment has no Chromium binary or debug endpoint. The acceptance matrix is:

| Actor | Check |
| --- | --- |
| Admin | Upload general student resource and lesson resource; inspect metadata; open/download; delete with in-app confirmation |
| Student A | See only Student A resources; open own lesson resource; receive 404 for an unknown or Student B resource ID |
| Student B | Cannot access Student A list or download route |
| Unknown ID | Returns generic 404 without filename, student, lesson or storage details |
| Direct object key | No public R2 URL or bucket listing is available |
| Mobile | Resource list, upload form, filters and lesson section do not overflow at 390px |
| Public boundary | Public homepage, sitemap, robots and non-Learn routes remain unchanged |

## Operational verification

The dedicated production bucket is `foxtutor-learn-resources`; local development uses `foxtutor-learn-resources-local`. R2 lifecycle expiration is intentionally not applied to the permanent `resources/` prefix. Active resource retention is at least 12 months by recorded metadata; deleted objects are removed immediately when the deletion operation succeeds.

