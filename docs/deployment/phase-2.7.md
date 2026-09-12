# Phase 2.7 deployment record

Date: 2026-09-12  
Status: deployed; authenticated production acceptance pending

## Release

The Month-first calendar replacement was deployed from the local implementation with:

```text
Worker: foxtutor-learn
Version: db13557c3-ffc2-43d2-a4e5-1f12e21eb44d
Deployment message: Phase 2.7 month-first calendar UX
Routes: foxtutor.org/learn and foxtutor.org/learn/*
```

The release uploads the rebuilt `learn.js` bundle and refined `learn.css`. No D1 migration, feed code, Access policy or public-site asset changed.

## Dependency and asset boundary

The Worker bundle contains the locally installed MIT-licensed Standard packages `@fullcalendar/core@6.1.21` and `@fullcalendar/daygrid@6.1.21`. No CDN, Premium/Scheduler package, license key, hosted service or framework runtime is used. Wrangler reported 64.11 KiB total asset upload and 14.64 KiB gzip for the deployment.

## Live smoke evidence

- `/learn/admin/calendar` redirects to the existing Cloudflare Access application.
- `/learn/student/calendar` redirects to the existing Cloudflare Access application.
- `/learn/calendar/feed/not-a-real-token` reaches the Worker and returns generic `404` with private/no-store/noindex headers.
- Public homepage, robots and sitemap smoke checks remain passing.

## Open release gates

Fresh authenticated Chromium sessions as admin and student must still verify Month default, Week switching, Previous/Today/Next, lesson placement/clicks, admin creation, student ownership, responsive behavior, keyboard/focus behavior, subscription hierarchy, timezone behavior, feed regression and controlled cleanup. The previous Worker `12109e60-3f5a-4bc2-8b89-8eefc7586249` remains the rollback target.
