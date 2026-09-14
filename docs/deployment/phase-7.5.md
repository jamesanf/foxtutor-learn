# Phase 7.5 deployment record

## Executable deployment

- Worker: `foxtutor-learn`
- Tested source commit: `1be5758248b01e1942e74f05b0ae86f552f40baf`
- Worker version: `e8dff528-34c6-48d6-90c6-9dedaec2df10`
- Deployment timestamp: `2026-09-14T17:10:45Z`
- Routes: `foxtutor.org/learn`, `foxtutor.org/learn/*`
- Scheduler: `*/5 * * * *`
- D1 migrations: no migrations to apply; remote state remains through
  `0024_phase72_global_timezone_operations.sql`

## Runtime probe

An unauthenticated `GET https://foxtutor.org/learn` returned the expected
Cloudflare Access `302` challenge and Ray ID
`a3b101c73dfe2581-MAN`. This verifies the perimeter only; it is not
authenticated application acceptance.

No Sandbox financial mutation, production customer collection, or mandate
mutation was performed by this deployment.
