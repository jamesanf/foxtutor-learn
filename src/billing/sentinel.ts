import { currentCalendarDate } from "../domain/calendar";

export interface BillingSentinelResult {
  businessDate: string;
  status: "PASSED" | "FAILED" | "SKIPPED";
  checks: number;
  failures: number;
}

interface SentinelCheck {
  code: string;
  query: string;
  bindings?: unknown[];
  context: string;
}

async function recordAlert(
  db: D1Database,
  code: string,
  context: string,
  failed: boolean,
  now: string
): Promise<void> {
  if (failed) {
    await db.prepare(
      `INSERT INTO billing_sentinel_alerts
        (id, diagnostic_code, status, safe_context, first_seen_at, last_seen_at, occurrence_count)
       VALUES (?, ?, 'OPEN', ?, ?, ?, 1)
       ON CONFLICT(diagnostic_code) DO UPDATE SET
         status = 'OPEN', safe_context = excluded.safe_context,
         last_seen_at = excluded.last_seen_at,
         occurrence_count = billing_sentinel_alerts.occurrence_count + 1,
         resolved_at = NULL`
    ).bind(crypto.randomUUID(), code, context.slice(0, 240), now, now).run();
  } else {
    await db.prepare(
      `UPDATE billing_sentinel_alerts
       SET status = 'RESOLVED', resolved_at = ?, last_seen_at = ?
       WHERE diagnostic_code = ? AND status = 'OPEN'`
    ).bind(now, now, code).run();
  }
}

export async function runBillingSentinel(
  db: D1Database,
  now = new Date().toISOString()
): Promise<BillingSentinelResult> {
  const businessDate = currentCalendarDate(new Date(now));
  await db.prepare(
    `INSERT INTO billing_sentinel_runs
      (id, business_date, status, started_at)
     VALUES (?, ?, 'RUNNING', ?)
     ON CONFLICT(business_date) DO NOTHING`
  ).bind(crypto.randomUUID(), businessDate, now).run();
  const run = await db.prepare(
    "SELECT id, status FROM billing_sentinel_runs WHERE business_date = ?"
  ).bind(businessDate).first<{ id: string; status: "RUNNING" | "PASSED" | "FAILED" }>();
  if (!run) throw new Error("Billing sentinel run could not be recorded.");
  if (run.status !== "RUNNING") return { businessDate, status: "SKIPPED", checks: 0, failures: 0 };

  const checks: SentinelCheck[] = [
    {
      code: "BILLING_SENTINEL_D1_SCHEMA",
      query: `SELECT COUNT(*) AS count
        FROM sqlite_master
        WHERE type IN ('table', 'view')
          AND name IN ('billing_accounts', 'billing_events', 'billing_invoices', 'billing_payments',
            'billing_sentinel_alerts', 'recurring_lesson_series', 'customer_credit_balances')`,
      context: "required billing tables/views",
    },
    {
      code: "BILLING_SENTINEL_DIRECT_DEBIT_STATE",
      query: `SELECT 1 FROM billing_accounts
        WHERE payment_method <> 'DIRECT_DEBIT'
           OR mandate_state NOT IN ('NOT_CONFIGURED', 'SETUP_REQUIRED', 'AUTHORISATION_PENDING', 'ACTIVE', 'FAILED', 'INACTIVE', 'UNKNOWN')
           OR provisioning_state NOT IN ('CONTACT_SYNC_REQUIRED', 'SETUP_REQUIRED', 'AUTHORISATION_PENDING', 'ACTIVE', 'FAILED', 'INACTIVE', 'UNKNOWN')
        LIMIT 1`,
      context: "invalid customer-level Direct Debit state",
    },
    {
      code: "BILLING_SENTINEL_DIRECT_DEBIT_LINK",
      query: `SELECT 1 FROM billing_accounts b
        LEFT JOIN students s ON s.id = b.student_id
        WHERE s.id IS NULL OR (b.mandate_state = 'ACTIVE' AND b.provider_contact_reference IS NULL)
        LIMIT 1`,
      context: "missing customer or active provider contact link",
    },
    {
      code: "BILLING_SENTINEL_ACCOUNTING_LINK",
      query: `SELECT 1 FROM external_accounting_links e
        JOIN external_accounting_links duplicate
          ON duplicate.local_entity_type = e.local_entity_type
         AND duplicate.local_entity_id = e.local_entity_id
         AND duplicate.provider = e.provider
         AND duplicate.external_resource_type = e.external_resource_type
         AND duplicate.status = 'VERIFIED'
         AND duplicate.id <> e.id
        WHERE e.status = 'VERIFIED'
        LIMIT 1`,
      context: "duplicate verified accounting contact mapping",
    },
    {
      code: "BILLING_SENTINEL_BILLING_EVENT",
      query: `SELECT 1 FROM billing_events
        WHERE gross_amount_minor <= 0
           OR net_amount_minor < 0
           OR net_amount_minor > gross_amount_minor
        LIMIT 1`,
      context: "invalid billing event amount",
    },
    {
      code: "BILLING_SENTINEL_INVOICE_LINK",
      query: `SELECT 1 FROM billing_invoices i
        LEFT JOIN billing_events e ON e.id = i.billing_event_id
        WHERE e.id IS NULL OR i.net_amount_minor < 0 OR i.net_amount_minor > i.gross_amount_minor
        LIMIT 1`,
      context: "orphaned or invalid invoice",
    },
    {
      code: "BILLING_SENTINEL_CREDIT",
      query: `SELECT 1 FROM customer_credit_accounts WHERE available_minor < 0 LIMIT 1`,
      context: "negative customer credit balance",
    },
    {
      code: "BILLING_SENTINEL_PAYMENT_READINESS",
      query: `SELECT 1 FROM billing_payments p
        JOIN billing_invoices i ON i.id = p.invoice_id
        WHERE p.status = 'CONFIRMED' AND i.status IN ('FAILED', 'CANCELLED')
        LIMIT 1`,
      context: "confirmed payment attached to invalid invoice state",
    },
    {
      code: "BILLING_SENTINEL_RECURRENCE_INVARIANT",
      query: `SELECT 1 FROM lessons l
        JOIN recurring_lesson_series r ON r.id = l.recurring_series_id
        WHERE l.status = 'scheduled'
          AND (r.status IN ('PAUSED', 'ENDED', 'CANCELLED') OR l.timezone <> 'Europe/London')
        LIMIT 1`,
      context: "scheduled lesson violates recurrence/timezone state",
    },
    {
      code: "BILLING_SENTINEL_STALE_COLLECTION",
      query: `SELECT 1 FROM billing_payments
        WHERE status IN ('SCHEDULED', 'PENDING')
          AND updated_at < datetime(?, '-3 days')
        LIMIT 1`,
      bindings: [now],
      context: "collection remains pending beyond bounded timeout",
    }
  ];

  let failures = 0;
  for (const check of checks) {
    let failed = false;
    try {
      const result = await db.prepare(check.query).bind(...(check.bindings ?? [])).first<Record<string, unknown>>();
      if (check.code === "BILLING_SENTINEL_D1_SCHEMA") {
        failed = Number(result?.count ?? 0) < 7;
      } else {
        failed = Boolean(result);
      }
    } catch {
      failed = true;
    }
    if (failed) failures++;
    await recordAlert(db, check.code, check.context, failed, now);
  }
  const status = failures ? "FAILED" : "PASSED";
  await db.prepare(
    `UPDATE billing_sentinel_runs
     SET status = ?, check_count = ?, failure_count = ?, safe_error_code = ?, completed_at = ?
     WHERE id = ?`
  ).bind(status, checks.length, failures, failures ? "BILLING_SENTINEL_FAILURE" : null, now, run.id).run();
  return { businessDate, status, checks: checks.length, failures };
}
