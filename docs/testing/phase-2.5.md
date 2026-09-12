# Phase 2.5 production calendar acceptance

This matrix is the internal production acceptance record. A `PASS` requires live evidence, not source inspection. Feed URLs and bearer tokens must never be recorded here.

| Area | Result | Evidence |
| --- | --- | --- |
| Production Worker contains calendar UI | PASS | Worker `56ab94cf-a035-4ec2-82b0-c5109299ebfa`; deployed route source and smoke boundary |
| Admin calendar | PASS | Fresh authenticated Chrome session: week navigation, correct day/time, lesson link and create-from-calendar handoff |
| Student calendar | PASS | Fresh authenticated Chrome session: linked lessons only, read-only representation and safe lesson links |
| D1 `0003` production migration | PASS | Remote `d1_migrations`, `calendar_feeds` table and indexes verified |
| Feed route | PASS | Exact feed path reaches Worker and invalid token returns generic 404 |
| Feed Access exception | PASS | Separate `foxtutor.org/learn/calendar/feed/*` app with `Bypass → Everyone` |
| Invalid token denial | PASS | Malformed/unknown token returns generic 404 without Access login |
| Student feed isolation | PASS | Controlled linked student feed contained only linked lessons and omitted name/private notes |
| Admin feed | PASS | Generated authenticated admin feed returned valid ICS and the controlled teaching event |
| Token rotation | PASS | Regeneration produced a new working URL |
| Token revocation/old-token invalidation | PASS | Rotated old token returned generic 404; test feeds were revoked/removed during cleanup |
| Stable UID | PASS | Lesson IDs remained stable across edit, completion and cancellation |
| Status handling | PASS | Scheduled/completed mapped to `CONFIRMED`; cancellation mapped to `CANCELLED` |
| Timezone behavior | PASS | Europe/London and America/New_York stored instants produced correct UTC ICS values |
| Change propagation | PASS | Edit, completion, cancellation and new lesson appeared on subsequent feed requests |
| Real calendar client | PASS | User-submitted subscribed calendar displayed `Lesson - Calendar verification (temporary)` for 13 September at 10:00 Europe/London after refresh |
| Mobile | PASS | Authenticated admin/student pages checked at 390px, 820px and 1440px with no document overflow |
| Accessibility checks | PASS | Keyboard focus target, labeled controls, navigation labels, headings, text statuses and focus CSS contract checked |
| Existing Phase 2 regression | PASS | Automated suite, lesson workflow, student ownership, admin denial, lifecycle and timezone checks passed |
| Public site regression | PASS | `npm run test:production`; public pages and sitemap boundary unchanged |
| Fixture cleanup | PASS | Exact temporary student and lesson rows removed; the legitimate admin feed subscription remains active and production retains only the two intended users |
| Documentation reconciliation | PASS | README, phase plan, agent instructions, changelog, architecture, deployment and testing records reconciled |
| Git clean | PASS | Verified after commit and push |

## HTTP checks

The production feed passed `GET`, `HEAD`, malformed/unknown, rotated-old and mutation-method checks. Valid responses were `text/calendar; charset=utf-8` with private/no-store and noindex protections. Mutation methods returned generic denial and did not alter feed state. Missing/invalid paths returned generic denial without interactive Access login on the exact feed route.

## External client behavior

The feed is read-only and live on request. The subscribed user calendar displayed the controlled event after its provider refresh. Apple Calendar, Google Calendar and other clients choose their own refresh cadence; Learn cannot promise immediate synchronization.
