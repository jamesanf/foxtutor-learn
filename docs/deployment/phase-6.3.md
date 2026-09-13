# Phase 6.3 - Deployment and handover record

## Verified deployment

- Repository `main`: `cef0591` at preflight start
- Remote `origin/main`: `cef0591` at preflight start
- Runtime source release: `b5a213f`
- Worker version: `26463610-92d2-490a-8e0f-c067cf45b846`
- Worker name: `foxtutor-learn`
- D1: `foxtutor-learn`
- D1 migration state: through `0017_accounting_operations.sql`; no pending
  migrations
- R2: `foxtutor-learn-resources`
- Routes: `foxtutor.org/learn` and `foxtutor.org/learn/*`
- Scheduled trigger: `*/5 * * * *`

The Worker version exposes the expected D1 and R2 bindings and no
`FREEAGENT_*` secrets. The current production runtime remains the deployed
Phase 6.2 hardening release; this documentation-only preflight does not
require a Worker deployment.

## Human handover required

The system owner must provide and approve, outside source control:

1. The complete commercial accounting contract, including
   `ADMIN_CANCELLED`, amount, payer, item/category, VAT/tax, currency and
   effective date.
2. FreeAgent sandbox client credentials and environment-specific encryption
   key.
3. The exact sandbox OAuth callback and intended company identity.
4. The approved sandbox payer/contact fixture and invoice mapping.
5. After sandbox sign-off, the independently verified production equivalents.
6. Approval for exactly one controlled production accounting event.

After handover, the next pass must configure sandbox only, perform the full
acceptance matrix, document provider-side evidence, and stop again before
production unless every go/no-go item is marked PASS.

No production accounting action, completion tag or completion claim is
permitted from this preflight.
