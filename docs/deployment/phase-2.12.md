# Phase 2.12 deployment record

Date: 2026-09-13  
Deployment status: **DEPLOYED**

| Field | Evidence |
| --- | --- |
| Worker | `foxtutor-learn` |
| Worker version | `9f2b7ebf-a37a-4711-a7b5-d6c233f72d20` |
| Deployment timestamp | `2026-09-12T23:07:37.894Z` |
| Git commit | `167cfc297bb8b745bc530d0cea8c07c5d6cf2313` |
| Remote commit | `167cfc297bb8b745bc530d0cea8c07c5d6cf2313` at deployment time |
| Production smoke | PASS — public site unchanged; `/learn` remains Access-protected |
| Authenticated browser | NOT RUN — no Chromium binary or debug endpoint available |
| Regeneration flow | Local source/query contracts PASS; production authenticated flow NOT VERIFIED |
| Bookings pagination | Local query/UI contracts PASS; production authenticated flow NOT VERIFIED |
| Past Lessons pagination | Local query/UI contracts PASS; production authenticated flow NOT VERIFIED |
| Calendar feed regression | Existing local token tests PASS; production old/new token rotation NOT VERIFIED |
| Security regression | Local authorization/privacy/feed tests PASS; production authenticated isolation NOT VERIFIED |
| Working tree | Clean at deployment; documentation follow-up is the only post-deploy change |

## Commands

Passed before deployment:

```text
npm test
npm run build
npm run check
npm run test:browser
npm run test:production
git diff --check
```

The real Chromium contract was attempted with `npm run test:browser:visual` and could not start because `127.0.0.1:9222` was unavailable. No completion tag was created because the authenticated production and visual gates remain open.
