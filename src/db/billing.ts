import {
  applyAvailableCredits,
  billingReference,
  type AvailableCredit
} from "../domain/billing";

export interface CustomerCreditBalance extends AvailableCredit {
  credit_id: string;
  account_id: string;
  student_id: string;
  payer_student_id: string;
  source_event_id: string;
  original_amount_minor: number | string;
  amount_consumed_minor: number | string;
  amount_refunded_minor: number | string;
  remaining_amount_minor: number | string;
  status: string;
  freeagent_credit_note_reference: string | null;
  freeagent_credit_note_url: string | null;
  created_at: string;
  updated_at: string;
  student_name?: string | null;
}

export interface BillingEvent {
  id: string;
  idempotency_key: string;
  event_type: "WEEKLY_LESSON" | "ADMIN_CANCELLATION";
  lesson_id: string | null;
  student_id: string;
  payer_student_id: string;
  source_event_id: string;
  lesson_date: string | null;
  billing_date: string | null;
  due_date: string | null;
  collection_date: string | null;
  cancellation_date: string | null;
  credit_note_date: string | null;
  gross_amount_minor: number | string;
  credit_applied_minor: number | string;
  net_amount_minor: number | string;
  currency: "GBP";
  status: string;
  external_reference: string | null;
  external_url: string | null;
  provider_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingInvoice {
  id: string;
  billing_event_id: string;
  student_id: string;
  gross_amount_minor: number | string;
  credit_applied_minor: number | string;
  net_amount_minor: number | string;
  currency: "GBP";
  lesson_date: string | null;
  billing_date: string;
  due_date: string | null;
  collection_date: string | null;
  status: string;
  provider_environment: "sandbox" | "production" | null;
  freeagent_reference: string | null;
  freeagent_url: string | null;
  provider_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingProviderOperation {
  id: string;
  operation_type: "CREATE_CREDIT_NOTE" | "APPLY_CREDIT_NOTE" | "INITIATE_DIRECT_DEBIT" | "RECONCILE";
  billing_event_id: string | null;
  invoice_id: string | null;
  credit_id: string | null;
  idempotency_key: string;
  status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "RETRYABLE" | "FAILED" | "UNKNOWN" | "BLOCKED";
  provider_reference: string | null;
  provider_url: string | null;
  provider_status: string | null;
  safe_error_code: string | null;
  safe_error_message: string | null;
  attempt_count: number;
  next_attempt_at: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface BillingRefund {
  id: string;
  credit_id: string;
  student_id: string;
  amount_minor: number | string;
  currency: "GBP";
  status: "REQUESTED" | "AUTHORISED" | "PROCESSING" | "PAID" | "FAILED" | "UNKNOWN";
  provider_reference: string | null;
  idempotency_key: string;
  authorised_by_user_id: string | null;
  requested_at: string;
  completed_at: string | null;
}

export interface BillingInvoiceOperation {
  id: string;
  invoice_id: string;
  operation_type: "CREATE_INVOICE" | "INITIATE_DIRECT_DEBIT" | "CANCEL_INVOICE" | "RECONCILE";
  idempotency_key: string;
  status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "RETRYABLE" | "FAILED" | "UNKNOWN" | "BLOCKED";
  provider_reference: string | null;
  provider_url: string | null;
  provider_status: string | null;
  safe_error_code: string | null;
  safe_error_message: string | null;
  attempt_count: number;
  next_attempt_at: string | null;
  human_authorized_at: string | null;
  human_authorized_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface BillingAlert {
  id: string;
  deduplication_key: string;
  alert_type: string;
  severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  student_id: string | null;
  payer_student_id: string | null;
  lesson_id: string | null;
  billing_event_id: string | null;
  invoice_id: string | null;
  provider_reference: string | null;
  current_state: string;
  recommended_action: string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  acknowledged_at?: string | null;
  acknowledged_by_user_id?: string | null;
  resolved_by_user_id?: string | null;
  resolution_note?: string | null;
  student_name?: string | null;
}

export interface BillingHistoryItem {
  id: string;
  kind: "LESSON_CHARGE" | "CANCELLATION" | "CREDIT" | "CREDIT_CONSUMED" | "INVOICE" | "PAYMENT";
  occurred_at: string;
  student_id: string;
  student_name: string | null;
  lesson_id: string | null;
  billing_event_id: string | null;
  invoice_id: string | null;
  credit_id: string | null;
  amount_minor: number | string | null;
  invoice_amount_minor?: number | string | null;
  provider_url?: string | null;
  provider_status?: string | null;
  status: string;
  description: string;
  provider_reference: string | null;
}

export interface BillingReconciliationTask {
  id: string;
  task_type: string;
  student_id: string | null;
  lesson_id: string | null;
  billing_event_id: string | null;
  invoice_id: string | null;
  credit_id: string | null;
  provider_reference: string | null;
  deduplication_key: string;
  status: string;
  safe_error_code: string | null;
  safe_error_message: string | null;
  attempt_count: number;
  next_attempt_at: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function asMinor(value: number | string): bigint {
  const parsed = BigInt(value);
  if (parsed < 0n) throw new Error("Billing minor units cannot be negative.");
  return parsed;
}

export function cancellationCreditStatements(
  db: D1Database,
  input: {
    creditId: string;
    accountId: string;
    studentId: string;
    payerStudentId: string;
    sourceEventId: string;
    lessonId: string;
    cancellationId: string;
    amountMinor: bigint;
    now: string;
    createProviderOperation?: boolean;
  }
): D1PreparedStatement[] {
  if (input.amountMinor <= 0n) throw new Error("Cancellation credit must be positive.");
  const idempotencyKey = `credit-grant:${input.sourceEventId}`;
  return [
    db.prepare(
      `INSERT INTO customer_credit_accounts
       (id, student_id, payer_student_id, currency, available_minor, created_at, updated_at)
       VALUES (?, ?, ?, 'GBP', 0, ?, ?)
       ON CONFLICT(student_id) DO UPDATE SET
         payer_student_id = excluded.payer_student_id,
         updated_at = excluded.updated_at`
    ).bind(input.accountId, input.studentId, input.payerStudentId, input.now, input.now),
    db.prepare(
      `INSERT INTO customer_credits
       (id, account_id, student_id, payer_student_id, source_event_id, source_lesson_id,
        source_cancellation_id, original_amount_minor, status, created_at, updated_at, idempotency_key)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, ?, ?
       WHERE EXISTS (SELECT 1 FROM lesson_history WHERE id = ?)
       ON CONFLICT(idempotency_key) DO NOTHING`
    ).bind(
      input.creditId,
      input.accountId,
      input.studentId,
      input.payerStudentId,
      input.sourceEventId,
      input.lessonId,
      input.cancellationId,
      Number(input.amountMinor),
      input.now,
      input.now,
      idempotencyKey,
      input.cancellationId
    ),
    db.prepare(
      `INSERT INTO credit_ledger_transactions
       (id, account_id, credit_id, transaction_type, amount_minor, source_event_id,
        source_lesson_id, source_cancellation_id, idempotency_key, created_at)
       SELECT ?, ?, ?, 'GRANT', ?, ?, ?, ?, ?, ?
       WHERE EXISTS (SELECT 1 FROM lesson_history WHERE id = ?)
       ON CONFLICT(idempotency_key) DO NOTHING`
    ).bind(
      `credit-ledger:${input.sourceEventId}`,
      input.accountId,
      input.creditId,
      Number(input.amountMinor),
      input.sourceEventId,
      input.lessonId,
      input.cancellationId,
      idempotencyKey,
      input.now,
      input.cancellationId
    ),
    ...(input.createProviderOperation === false ? [] : [db.prepare(
      `INSERT INTO billing_provider_operations
       (id, operation_type, credit_id, idempotency_key, status, created_at, updated_at)
       SELECT ?, 'CREATE_CREDIT_NOTE', ?, ?, 'PENDING', ?, ?
       WHERE EXISTS (SELECT 1 FROM lesson_history WHERE id = ?)
       ON CONFLICT(idempotency_key) DO NOTHING`
    ).bind(
      `provider-operation:${input.sourceEventId}`,
      input.creditId,
      `credit-note:${input.sourceEventId}`,
      input.now,
      input.now,
      input.cancellationId
    )])
  ];
}

export async function findBillingEvent(db: D1Database, id: string): Promise<BillingEvent | null> {
  return db.prepare("SELECT * FROM billing_events WHERE id = ?").bind(id).first<BillingEvent>();
}

export async function findBillingEventByIdempotencyKey(db: D1Database, key: string): Promise<BillingEvent | null> {
  return db.prepare("SELECT * FROM billing_events WHERE idempotency_key = ?").bind(key).first<BillingEvent>();
}

export async function createLessonBillingEvent(
  db: D1Database,
  input: {
    id: string;
    lessonId: string;
    studentId: string;
    payerStudentId: string;
    lessonDate: string;
    billingDate: string;
    dueDate: string | null;
    collectionDate: string;
    grossAmountMinor: bigint;
    now: string;
  }
): Promise<void> {
  if (input.grossAmountMinor <= 0n) throw new Error("Lesson billing amount must be positive.");
  await db.prepare(
    `INSERT INTO billing_events
     (id, idempotency_key, event_type, lesson_id, student_id, payer_student_id, source_event_id,
      lesson_date, billing_date, due_date, collection_date, gross_amount_minor, net_amount_minor,
      currency, status, created_at, updated_at)
     VALUES (?, ?, 'WEEKLY_LESSON', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'GBP', 'PENDING', ?, ?)
     ON CONFLICT(idempotency_key) DO NOTHING`
  ).bind(
    input.id,
    `billing:lesson:${input.lessonId}`,
    input.lessonId,
    input.studentId,
    input.payerStudentId,
    input.lessonId,
    input.lessonDate,
    input.billingDate,
    input.dueDate,
    input.collectionDate,
    Number(input.grossAmountMinor),
    Number(input.grossAmountMinor),
    input.now,
    input.now
  ).run();
}

export async function listAvailableCreditBalances(db: D1Database, payerStudentId: string): Promise<CustomerCreditBalance[]> {
  const result = await db.prepare(
    `SELECT credit_id, account_id, student_id, payer_student_id, original_amount_minor,
            amount_consumed_minor, amount_refunded_minor, remaining_amount_minor, status,
            freeagent_credit_note_reference, freeagent_credit_note_url, created_at, updated_at
     FROM customer_credit_balances
     WHERE payer_student_id = ? AND remaining_amount_minor > 0
     ORDER BY created_at ASC, credit_id ASC`
  ).bind(payerStudentId).all<CustomerCreditBalance>();
  return result.results.map((row) => ({
    ...row,
    creditId: row.credit_id,
    remainingMinor: asMinor(row.remaining_amount_minor),
    createdAt: row.created_at
  }));
}

export async function findCreditForSourceEvent(db: D1Database, sourceEventId: string): Promise<CustomerCreditBalance | null> {
  return db.prepare(
    `SELECT credit_id, account_id, student_id, payer_student_id, source_event_id,
            original_amount_minor, amount_consumed_minor, amount_refunded_minor, remaining_amount_minor, status,
            freeagent_credit_note_reference, freeagent_credit_note_url, created_at, updated_at
     FROM customer_credit_balances WHERE source_event_id = ?`
  ).bind(sourceEventId).first<CustomerCreditBalance>();
}

export async function findCreditById(db: D1Database, creditId: string): Promise<CustomerCreditBalance | null> {
  return db.prepare(
    `SELECT credit_id, account_id, student_id, payer_student_id, source_event_id,
            original_amount_minor, amount_consumed_minor, amount_refunded_minor, remaining_amount_minor, status,
            freeagent_credit_note_reference, freeagent_credit_note_url, created_at, updated_at
     FROM customer_credit_balances WHERE credit_id = ?`
  ).bind(creditId).first<CustomerCreditBalance>();
}

export async function listDueBillingProviderOperations(db: D1Database, now: string, limit: number): Promise<BillingProviderOperation[]> {
  const result = await db.prepare(
    `SELECT * FROM billing_provider_operations
     WHERE status IN ('PENDING', 'RETRYABLE')
       AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
     ORDER BY created_at ASC, id ASC LIMIT ?`
  ).bind(now, limit).all<BillingProviderOperation>();
  return result.results;
}

export async function findBillingProviderOperation(db: D1Database, id: string): Promise<BillingProviderOperation | null> {
  return db.prepare("SELECT * FROM billing_provider_operations WHERE id = ?")
    .bind(id)
    .first<BillingProviderOperation>();
}

export async function claimBillingProviderOperation(
  db: D1Database,
  id: string,
  now: string,
  staleBefore: string
): Promise<BillingProviderOperation | null> {
  await db.prepare(
    `UPDATE billing_provider_operations
     SET status = 'UNKNOWN', provider_status = 'STALE_PROCESSING',
         safe_error_code = 'STALE_PROCESSING',
         safe_error_message = 'The previous provider operation claim expired; reconcile before retrying.',
         next_attempt_at = NULL, updated_at = ?
     WHERE status = 'PROCESSING' AND updated_at < ?`
  ).bind(now, staleBefore).run();
  const claimed = await db.prepare(
    `UPDATE billing_provider_operations
     SET status = 'PROCESSING', attempt_count = attempt_count + 1,
         updated_at = ?
     WHERE id = ? AND status IN ('PENDING', 'RETRYABLE')
       AND (next_attempt_at IS NULL OR next_attempt_at <= ?)`
  ).bind(now, id, now).run();
  if (!claimed.meta.changes) return null;
  return db.prepare("SELECT * FROM billing_provider_operations WHERE id = ?").bind(id).first<BillingProviderOperation>();
}

export async function markBillingProviderOperation(
  db: D1Database,
  id: string,
  input: {
    status: BillingProviderOperation["status"];
    providerReference?: string | null;
    providerUrl?: string | null;
    providerStatus?: string | null;
    safeErrorCode?: string | null;
    safeErrorMessage?: string | null;
    nextAttemptAt?: string | null;
  },
  now: string
): Promise<void> {
  await db.prepare(
    `UPDATE billing_provider_operations
     SET status = ?, provider_reference = COALESCE(?, provider_reference),
         provider_url = COALESCE(?, provider_url), provider_status = ?,
         safe_error_code = ?, safe_error_message = ?, next_attempt_at = ?,
         completed_at = CASE WHEN ? IN ('SUCCEEDED', 'BLOCKED') THEN ? ELSE completed_at END,
         updated_at = ?
     WHERE id = ? AND status = 'PROCESSING'`
  ).bind(
    input.status,
    input.providerReference ?? null,
    input.providerUrl ?? null,
    input.providerStatus ?? null,
    input.safeErrorCode ?? null,
    input.safeErrorMessage?.slice(0, 240) ?? null,
    input.nextAttemptAt ?? null,
    input.status,
    input.status === "SUCCEEDED" || input.status === "BLOCKED" ? now : null,
    now,
    id
  ).run();
}

export async function saveCreditProviderReference(
  db: D1Database,
  creditId: string,
  input: { reference: string; url: string },
  now: string
): Promise<void> {
  await db.prepare(
    `UPDATE customer_credits
     SET freeagent_credit_note_reference = ?, freeagent_credit_note_url = ?, updated_at = ?
     WHERE id = ?`
  ).bind(input.reference, input.url, now, creditId).run();
}

export async function recordCompletedCreditRefund(
  db: D1Database,
  input: {
    refundId: string;
    creditId: string;
    studentId: string;
    amountMinor: bigint;
    providerReference: string;
    now: string;
  }
): Promise<boolean> {
  if (input.amountMinor <= 0n) throw new Error("Refund amount must be positive.");
  const results = await db.batch([
    db.prepare(
      `INSERT INTO credit_ledger_transactions
       (id, account_id, credit_id, transaction_type, amount_minor, source_event_id,
        refund_id, provider_reference, idempotency_key, created_at)
       SELECT ?, c.account_id, c.id, 'REFUND', ?, ?, ?, ?, ?, ?
       FROM customer_credits c
       JOIN billing_refunds r ON r.credit_id = c.id
       WHERE r.id = ? AND r.student_id = ? AND r.amount_minor = ?
         AND r.status IN ('AUTHORISED', 'PROCESSING')
       ON CONFLICT(idempotency_key) DO NOTHING`
    ).bind(
      `credit-ledger-refund:${input.refundId}`,
      Number(input.amountMinor),
      input.refundId,
      input.refundId,
      input.providerReference,
      `credit-refund:${input.refundId}`,
      input.now,
      input.refundId,
      input.studentId,
      Number(input.amountMinor)
    ),
    db.prepare(
      `UPDATE billing_refunds
       SET status = 'PAID', provider_reference = ?, completed_at = ?
       WHERE id = ? AND status IN ('AUTHORISED', 'PROCESSING')`
    ).bind(input.providerReference, input.now, input.refundId)
  ]);
  return Boolean(results[1]?.meta.changes);
}

export async function createAuthorisedCreditRefund(
  db: D1Database,
  input: {
    refundId: string;
    creditId: string;
    studentId: string;
    amountMinor: bigint;
    authorisedByUserId: string;
    now: string;
  }
): Promise<BillingRefund | null> {
  if (input.amountMinor <= 0n) throw new Error("Refund amount must be positive.");
  await db.prepare(
    `INSERT INTO billing_refunds
     (id, credit_id, student_id, amount_minor, currency, status, idempotency_key,
      authorised_by_user_id, requested_at)
     SELECT ?, credit_id, student_id, ?, 'GBP', 'AUTHORISED', ?, ?, ?
     FROM customer_credit_balances
      WHERE credit_id = ? AND student_id = ?
        AND remaining_amount_minor - COALESCE((
          SELECT SUM(amount_minor)
          FROM billing_refunds pending
          WHERE pending.credit_id = customer_credit_balances.credit_id
            AND pending.status IN ('AUTHORISED', 'PROCESSING')
        ), 0) >= ?
      ON CONFLICT(idempotency_key) DO NOTHING`
  ).bind(
    input.refundId,
    Number(input.amountMinor),
    `credit-refund:${input.refundId}`,
    input.authorisedByUserId,
    input.now,
    input.creditId,
    input.studentId,
    Number(input.amountMinor)
  ).run();
  return db.prepare("SELECT * FROM billing_refunds WHERE id = ?")
    .bind(input.refundId)
    .first<BillingRefund>();
}

export async function createBillingInvoice(
  db: D1Database,
  input: {
    id: string;
    billingEventId: string;
    studentId: string;
    grossAmountMinor: bigint;
    billingDate: string;
    lessonDate: string | null;
    dueDate: string | null;
    collectionDate: string | null;
    providerEnvironment?: "sandbox" | "production" | null;
    now: string;
  }
): Promise<void> {
  await db.prepare(
    `INSERT INTO billing_invoices
     (id, billing_event_id, student_id, gross_amount_minor, credit_applied_minor,
      net_amount_minor, currency, lesson_date, billing_date, due_date, collection_date,
      status, provider_environment, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, 'GBP', ?, ?, ?, ?, 'PENDING_PROVIDER', ?, ?, ?)
     ON CONFLICT(billing_event_id) DO NOTHING`
  ).bind(
    input.id,
    input.billingEventId,
    input.studentId,
    Number(input.grossAmountMinor),
    Number(input.grossAmountMinor),
    input.lessonDate,
    input.billingDate,
    input.dueDate,
    input.collectionDate,
    input.providerEnvironment ?? null,
    input.now,
    input.now
  ).run();
}

export async function applyCreditToInvoice(
  db: D1Database,
  input: {
    invoiceId: string;
    billingEventId: string;
    payerStudentId: string;
    grossAmountMinor: bigint;
    now: string;
  }
): Promise<{ creditAppliedMinor: bigint; netAmountMinor: bigint }> {
  const existing = await db.prepare(
    "SELECT credit_applied_minor, net_amount_minor FROM billing_invoices WHERE id = ?"
  ).bind(input.invoiceId).first<{ credit_applied_minor: number | string; net_amount_minor: number | string }>();
  if (!existing) throw new Error("Billing invoice must exist before credit is applied.");
  if (asMinor(existing.credit_applied_minor) > 0n) {
    return {
      creditAppliedMinor: asMinor(existing.credit_applied_minor),
      netAmountMinor: asMinor(existing.net_amount_minor)
    };
  }

  const credits = await listAvailableCreditBalances(db, input.payerStudentId);
  const application = applyAvailableCredits(input.grossAmountMinor, credits);
  const statements: D1PreparedStatement[] = [];
  for (const allocation of application.allocations) {
    const credit = credits.find((candidate) => candidate.creditId === allocation.creditId);
    if (!credit) throw new Error("Credit allocation became unavailable during invoice preparation.");
    const transactionId = `credit-consumption:${input.invoiceId}:${allocation.creditId}`;
    statements.push(
      db.prepare(
        `INSERT INTO credit_ledger_transactions
         (id, account_id, credit_id, transaction_type, amount_minor, source_event_id,
          invoice_id, idempotency_key, created_at)
         VALUES (?, ?, ?, 'CONSUMPTION', ?, ?, ?, ?, ?)
         ON CONFLICT(idempotency_key) DO NOTHING`
      ).bind(
        transactionId,
        credit.account_id,
        allocation.creditId,
        Number(allocation.amountMinor),
        input.billingEventId,
        input.invoiceId,
        transactionId,
        input.now
      ),
      db.prepare(
        `INSERT INTO billing_invoice_credit_applications
         (id, invoice_id, credit_id, ledger_transaction_id, amount_minor, status, idempotency_key, created_at)
         VALUES (?, ?, ?, ?, ?, 'RECORDED', ?, ?)
         ON CONFLICT(idempotency_key) DO NOTHING`
      ).bind(
        `credit-application:${input.invoiceId}:${allocation.creditId}`,
        input.invoiceId,
        allocation.creditId,
        transactionId,
        Number(allocation.amountMinor),
        `credit-application:${input.invoiceId}:${allocation.creditId}`,
        input.now
      )
    );
  }
  statements.push(
    db.prepare(
      `UPDATE billing_invoices
       SET credit_applied_minor = ?, net_amount_minor = ?, updated_at = ?
       WHERE id = ?`
    ).bind(
      Number(application.creditAppliedMinor),
      Number(application.netAmountMinor),
      input.now,
      input.invoiceId
    ),
    db.prepare(
      `UPDATE billing_events
       SET credit_applied_minor = ?, net_amount_minor = ?, status = 'INVOICE_PENDING', updated_at = ?
       WHERE id = ?`
    ).bind(
      Number(application.creditAppliedMinor),
      Number(application.netAmountMinor),
      input.now,
      input.billingEventId
    )
  );
  await db.batch(statements);
  return {
    creditAppliedMinor: application.creditAppliedMinor,
    netAmountMinor: application.netAmountMinor
  };
}

export async function invoiceCreditReversalStatements(
  db: D1Database,
  invoiceId: string,
  now: string
): Promise<D1PreparedStatement[]> {
  const applications = await db.prepare(
    `SELECT a.credit_id, a.ledger_transaction_id, c.account_id, a.amount_minor
     FROM billing_invoice_credit_applications a
     JOIN customer_credits c ON c.id = a.credit_id
     WHERE a.invoice_id = ? AND a.status = 'RECORDED'`
  ).bind(invoiceId).all<{
    credit_id: string;
    ledger_transaction_id: string;
    account_id: string;
    amount_minor: number | string;
  }>();
  return applications.results.flatMap((application) => [
    db.prepare(
      `INSERT INTO credit_ledger_transactions
       (id, account_id, credit_id, transaction_type, amount_minor, source_event_id,
        invoice_id, idempotency_key, created_at)
       VALUES (?, ?, ?, 'REVERSAL', ?, ?, ?, ?, ?)
       ON CONFLICT(idempotency_key) DO NOTHING`
    ).bind(
      `credit-reversal:${invoiceId}:${application.credit_id}`,
      application.account_id,
      application.credit_id,
      Number(application.amount_minor),
      `credit-reversal:${invoiceId}`,
      invoiceId,
      `credit-reversal:${invoiceId}:${application.credit_id}`,
      now
    ),
    db.prepare(
      `UPDATE billing_invoice_credit_applications
       SET status = 'PROVIDER_FAILED'
       WHERE invoice_id = ? AND credit_id = ? AND status = 'RECORDED'`
    ).bind(invoiceId, application.credit_id)
  ]);
}

export async function reverseInvoiceCreditApplications(
  db: D1Database,
  invoiceId: string,
  now: string
): Promise<void> {
  const statements = await invoiceCreditReversalStatements(db, invoiceId, now);
  if (statements.length) await db.batch(statements);
}

export async function resetInvoiceCreditAllocation(
  db: D1Database,
  invoiceId: string,
  billingEventId: string,
  grossAmountMinor: bigint,
  now: string
): Promise<void> {
  await db.batch([
    db.prepare(
      `UPDATE billing_invoices
       SET credit_applied_minor = 0, net_amount_minor = ?, status = 'PENDING_PROVIDER',
           provider_status = NULL, updated_at = ?
       WHERE id = ?`
    ).bind(Number(grossAmountMinor), now, invoiceId),
    db.prepare(
      `UPDATE billing_events
       SET credit_applied_minor = 0, net_amount_minor = ?, status = 'PENDING', provider_status = NULL, updated_at = ?
       WHERE id = ?`
    ).bind(Number(grossAmountMinor), now, billingEventId)
  ]);
}

export function creditNoteReference(creditId: string): string {
  return billingReference("CRN", creditId);
}

export async function ensureBillingInvoiceForEvent(
  db: D1Database,
  input: { billingEventId: string; now: string; providerEnvironment?: "sandbox" | "production" | null }
): Promise<BillingInvoice | null> {
  const event = await findBillingEvent(db, input.billingEventId);
  if (!event || event.status === "CANCELLED") return null;
  const grossAmountMinor = asMinor(event.gross_amount_minor);
  await db.batch([
    db.prepare(
      `INSERT INTO billing_invoices
       (id, billing_event_id, student_id, gross_amount_minor, credit_applied_minor,
        net_amount_minor, currency, lesson_date, billing_date, due_date, collection_date,
        status, provider_environment, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, 'GBP', ?, ?, ?, ?, 'PENDING_PROVIDER', ?, ?, ?)
       ON CONFLICT(billing_event_id) DO NOTHING`
    ).bind(
      `invoice:${event.id}`,
      event.id,
      event.student_id,
      Number(grossAmountMinor),
      Number(grossAmountMinor),
      event.lesson_date,
      event.billing_date ?? input.now.slice(0, 10),
      event.due_date,
      event.collection_date,
      input.providerEnvironment ?? null,
      input.now,
      input.now
    ),
    db.prepare(
      `INSERT INTO billing_invoice_operations
       (id, invoice_id, operation_type, idempotency_key, status, created_at, updated_at)
       SELECT ?, id, 'CREATE_INVOICE', ?, 'PENDING', ?, ?
       FROM billing_invoices WHERE billing_event_id = ?
       ON CONFLICT(invoice_id, operation_type) DO NOTHING`
    ).bind(
      `invoice-operation:${event.id}`,
      `invoice-create:${event.id}`,
      input.now,
      input.now,
      event.id
    )
  ]);
  return db.prepare("SELECT * FROM billing_invoices WHERE billing_event_id = ?").bind(event.id).first<BillingInvoice>();
}

export async function findBillingInvoice(db: D1Database, id: string): Promise<BillingInvoice | null> {
  return db.prepare("SELECT * FROM billing_invoices WHERE id = ?").bind(id).first<BillingInvoice>();
}

export async function updateBillingInvoice(
  db: D1Database,
  id: string,
  input: {
    status?: BillingInvoice["status"];
    creditAppliedMinor?: bigint;
    netAmountMinor?: bigint;
    freeagentReference?: string | null;
    freeagentUrl?: string | null;
    providerStatus?: string | null;
    now: string;
  }
): Promise<void> {
  await db.prepare(
    `UPDATE billing_invoices
     SET status = COALESCE(?, status),
         credit_applied_minor = COALESCE(?, credit_applied_minor),
         net_amount_minor = COALESCE(?, net_amount_minor),
         freeagent_reference = COALESCE(?, freeagent_reference),
         freeagent_url = COALESCE(?, freeagent_url),
         provider_status = ?,
         updated_at = ?
     WHERE id = ?`
  ).bind(
    input.status ?? null,
    input.creditAppliedMinor === undefined ? null : Number(input.creditAppliedMinor),
    input.netAmountMinor === undefined ? null : Number(input.netAmountMinor),
    input.freeagentReference ?? null,
    input.freeagentUrl ?? null,
    input.providerStatus ?? null,
    input.now,
    id
  ).run();
}

export async function updateBillingEventStatus(
  db: D1Database,
  id: string,
  status: BillingEvent["status"],
  now: string,
  providerReference?: string | null,
  providerUrl?: string | null,
  providerStatus?: string | null
): Promise<void> {
  await db.prepare(
    `UPDATE billing_events SET status = CASE WHEN status = 'CANCELLED' THEN status ELSE ? END,
       external_reference = COALESCE(?, external_reference),
       external_url = COALESCE(?, external_url), provider_status = ?, updated_at = ?
     WHERE id = ?`
  ).bind(status, providerReference ?? null, providerUrl ?? null, providerStatus ?? null, now, id).run();
}

export async function listPendingBillingEvents(db: D1Database, now: string, limit: number): Promise<BillingEvent[]> {
  const instant = new Date(now);
  if (!Number.isFinite(instant.getTime())) throw new Error("Billing scheduler time must be a valid instant.");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    calendar: "iso8601",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const londonDate = `${value("year")}-${value("month")}-${value("day")}`;
  const londonTime = `${value("hour")}:${value("minute")}`;
  const result = await db.prepare(
    `SELECT * FROM billing_events
     WHERE status = 'PENDING'
       AND (
         collection_date IS NULL
         OR collection_date < ?
         OR (collection_date = ? AND ? >= '22:00')
       )
     ORDER BY lesson_date ASC, id ASC LIMIT ?`
  ).bind(londonDate, londonDate, londonTime, limit).all<BillingEvent>();
  return result.results;
}

export async function listDueBillingInvoiceOperations(db: D1Database, now: string, limit: number): Promise<BillingInvoiceOperation[]> {
  const result = await db.prepare(
    `SELECT op.* FROM billing_invoice_operations op
     JOIN billing_invoices i ON i.id = op.invoice_id
     WHERE op.status IN ('PENDING', 'RETRYABLE')
       AND (op.next_attempt_at IS NULL OR op.next_attempt_at <= ?)
       AND (
         op.operation_type != 'INITIATE_DIRECT_DEBIT'
         OR COALESCE(i.provider_environment, '') != 'production'
         OR i.net_amount_minor != 100
         OR op.human_authorized_at IS NOT NULL
       )
     ORDER BY op.created_at ASC, op.id ASC LIMIT ?`
  ).bind(now, limit).all<BillingInvoiceOperation>();
  return result.results;
}

export async function authorizeBillingInvoiceDirectDebit(
  db: D1Database,
  invoiceId: string,
  userId: string,
  now: string
): Promise<boolean> {
  const result = await db.prepare(
    `UPDATE billing_invoice_operations
     SET human_authorized_at = ?, human_authorized_by_user_id = ?, updated_at = ?
     WHERE invoice_id = ? AND operation_type = 'INITIATE_DIRECT_DEBIT'
       AND status IN ('PENDING', 'RETRYABLE')
       AND human_authorized_at IS NULL`
  ).bind(now, userId, now, invoiceId).run();
  return result.meta.changes > 0;
}

export async function ensureDirectDebitOperationForInvoice(
  db: D1Database,
  invoiceId: string,
  now: string
): Promise<boolean> {
  const result = await db.prepare(
    `INSERT INTO billing_invoice_operations
     (id, invoice_id, operation_type, idempotency_key, status, created_at, updated_at)
     SELECT 'direct-debit-operation:' || id, id, 'INITIATE_DIRECT_DEBIT',
            'direct-debit:' || id, 'PENDING', ?, ?
     FROM billing_invoices
     WHERE id = ? AND status = 'SENT' AND net_amount_minor > 0
       AND collection_date IS NOT NULL AND collection_date <= ?
     ON CONFLICT(invoice_id, operation_type) DO NOTHING`
  ).bind(now, now, invoiceId, now.slice(0, 10)).run();
  return result.meta.changes > 0;
}

export async function ensureDueDirectDebitOperations(db: D1Database, today: string, now: string): Promise<number> {
  const result = await db.prepare(
    `INSERT INTO billing_invoice_operations
     (id, invoice_id, operation_type, idempotency_key, status, created_at, updated_at)
     SELECT 'direct-debit-operation:' || i.id, i.id, 'INITIATE_DIRECT_DEBIT',
            'direct-debit:' || i.id, 'PENDING', ?, ?
     FROM billing_invoices i
     JOIN billing_events e ON e.id = i.billing_event_id
     LEFT JOIN billing_invoice_operations op
       ON op.invoice_id = i.id AND op.operation_type = 'INITIATE_DIRECT_DEBIT'
     WHERE i.status = 'SENT' AND i.net_amount_minor > 0
       AND i.collection_date IS NOT NULL AND i.collection_date <= ?
       AND e.status != 'CANCELLED' AND op.id IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM billing_emergency_payg_overrides p
         WHERE p.billing_event_id = e.id AND p.status = 'ACTIVE'
       )
     ON CONFLICT(invoice_id, operation_type) DO NOTHING`
  ).bind(now, now, today).run();
  return result.meta.changes;
}

export function invoiceCancellationStatement(db: D1Database, invoiceId: string, now: string): D1PreparedStatement {
  return db.prepare(
    `INSERT INTO billing_invoice_operations
     (id, invoice_id, operation_type, idempotency_key, status, created_at, updated_at)
     SELECT 'cancel-invoice-operation:' || i.id, i.id, 'CANCEL_INVOICE',
            'cancel-invoice:' || i.id, 'PENDING', ?, ?
     FROM billing_invoices i
     WHERE i.id = ? AND i.freeagent_url IS NOT NULL
     AND (
       i.status IN ('SENT', 'PAYMENT_PENDING')
       OR (i.status = 'PAID' AND i.provider_status = 'CREDIT_COVERED' AND i.net_amount_minor = 0)
     )
       AND NOT EXISTS (
         SELECT 1 FROM billing_invoice_operations op
         WHERE op.invoice_id = i.id AND op.operation_type = 'INITIATE_DIRECT_DEBIT'
           AND op.status IN ('PROCESSING', 'SUCCEEDED', 'UNKNOWN')
       )
       AND NOT EXISTS (
         SELECT 1 FROM billing_payments p
         WHERE p.invoice_id = i.id
           AND p.status IN ('SCHEDULED', 'SUBMITTED', 'PENDING', 'CONFIRMED', 'FAILED', 'UNKNOWN')
       )
     ON CONFLICT(invoice_id, operation_type) DO NOTHING`
  ).bind(now, now, invoiceId);
}

export async function claimBillingInvoiceOperation(
  db: D1Database,
  id: string,
  now: string,
  staleBefore: string
): Promise<BillingInvoiceOperation | null> {
  await db.prepare(
    `UPDATE billing_invoice_operations
     SET status = 'UNKNOWN', provider_status = 'STALE_PROCESSING',
         safe_error_code = 'STALE_PROCESSING',
         safe_error_message = 'The previous invoice operation claim expired; reconcile before retrying.',
         updated_at = ?
     WHERE status = 'PROCESSING' AND updated_at < ?`
  ).bind(now, staleBefore).run();
  const claimed = await db.prepare(
    `UPDATE billing_invoice_operations
     SET status = 'PROCESSING', attempt_count = attempt_count + 1, updated_at = ?
     WHERE id = ? AND status IN ('PENDING', 'RETRYABLE')
       AND (next_attempt_at IS NULL OR next_attempt_at <= ?)`
  ).bind(now, id, now).run();
  if (!claimed.meta.changes) return null;
  return db.prepare("SELECT * FROM billing_invoice_operations WHERE id = ?").bind(id).first<BillingInvoiceOperation>();
}

export async function markBillingInvoiceOperation(
  db: D1Database,
  id: string,
  input: {
    status: BillingInvoiceOperation["status"];
    providerReference?: string | null;
    providerUrl?: string | null;
    providerStatus?: string | null;
    safeErrorCode?: string | null;
    safeErrorMessage?: string | null;
    nextAttemptAt?: string | null;
  },
  now: string
): Promise<void> {
  await db.prepare(
    `UPDATE billing_invoice_operations
     SET status = ?, provider_reference = COALESCE(?, provider_reference),
         provider_url = COALESCE(?, provider_url), provider_status = ?,
         safe_error_code = ?, safe_error_message = ?, next_attempt_at = ?,
         completed_at = CASE WHEN ? IN ('SUCCEEDED', 'BLOCKED') THEN ? ELSE completed_at END,
         updated_at = ?
     WHERE id = ? AND status = 'PROCESSING'`
  ).bind(
    input.status,
    input.providerReference ?? null,
    input.providerUrl ?? null,
    input.providerStatus ?? null,
    input.safeErrorCode ?? null,
    input.safeErrorMessage?.slice(0, 240) ?? null,
    input.nextAttemptAt ?? null,
    input.status,
    input.status === "SUCCEEDED" || input.status === "BLOCKED" ? now : null,
    now,
    id
  ).run();
}

export async function createBillingAlert(
  db: D1Database,
  input: {
    id: string;
    deduplicationKey: string;
    alertType: string;
    severity: BillingAlert["severity"];
    studentId?: string | null;
    payerStudentId?: string | null;
    lessonId?: string | null;
    billingEventId?: string | null;
    invoiceId?: string | null;
    providerReference?: string | null;
    currentState: string;
    recommendedAction: string;
    now: string;
  }
): Promise<boolean> {
  const result = await db.prepare(
    `INSERT INTO billing_alerts
     (id, deduplication_key, alert_type, severity, student_id, payer_student_id,
      lesson_id, billing_event_id, invoice_id, provider_reference, current_state,
      recommended_action, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)
     ON CONFLICT(deduplication_key) DO UPDATE SET
       current_state = excluded.current_state,
       recommended_action = excluded.recommended_action,
       provider_reference = COALESCE(excluded.provider_reference, billing_alerts.provider_reference),
       updated_at = excluded.updated_at
     WHERE billing_alerts.status != 'RESOLVED'`
  ).bind(
    input.id,
    input.deduplicationKey,
    input.alertType,
    input.severity,
    input.studentId ?? null,
    input.payerStudentId ?? null,
    input.lessonId ?? null,
    input.billingEventId ?? null,
    input.invoiceId ?? null,
    input.providerReference ?? null,
    input.currentState,
    input.recommendedAction,
    input.now,
    input.now
  ).run();
  return Boolean(result.meta.changes);
}

export async function listOpenBillingAlerts(
  db: D1Database,
  limit = 100,
  providerEnvironment?: "sandbox" | "production" | null
): Promise<BillingAlert[]> {
  const result = await db.prepare(
    `SELECT a.*, s.name AS student_name
     FROM billing_alerts a
     LEFT JOIN students s ON s.id = a.student_id
     WHERE a.status IN ('OPEN', 'ACKNOWLEDGED')
       ${providerEnvironment
         ? "AND (a.invoice_id IS NULL OR EXISTS (SELECT 1 FROM billing_invoices i WHERE i.id = a.invoice_id AND i.provider_environment = ?))"
         : ""}
     ORDER BY CASE a.severity WHEN 'CRITICAL' THEN 0 WHEN 'ERROR' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END,
              a.created_at DESC, a.id DESC LIMIT ?`
  ).bind(
    ...(providerEnvironment ? [providerEnvironment] : []),
    Math.max(1, Math.min(limit, 500))
  ).all<BillingAlert>();
  return result.results;
}

export async function updateBillingAlertStatus(
  db: D1Database,
  id: string,
  input: { status: "ACKNOWLEDGED" | "RESOLVED" | "OPEN"; userId: string; note?: string },
  now: string
): Promise<boolean> {
  const updated = await db.prepare(
    `UPDATE billing_alerts
     SET status = ?, acknowledged_at = CASE WHEN ? = 'ACKNOWLEDGED' THEN ? ELSE acknowledged_at END,
         acknowledged_by_user_id = CASE WHEN ? = 'ACKNOWLEDGED' THEN ? ELSE acknowledged_by_user_id END,
         resolved_at = CASE WHEN ? = 'RESOLVED' THEN ? ELSE NULL END,
         resolved_by_user_id = CASE WHEN ? = 'RESOLVED' THEN ? ELSE resolved_by_user_id END,
         resolution_note = COALESCE(?, resolution_note), updated_at = ?
     WHERE id = ?`
  ).bind(
    input.status, input.status, now, input.status, input.userId,
    input.status, now, input.status, input.userId, input.note ?? null, now, id
  ).run();
  if (!updated.meta.changes) return false;
  await db.prepare(
    `INSERT INTO billing_alert_events (id, alert_id, event_type, actor_user_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    id,
    input.status === "ACKNOWLEDGED" ? "ACKNOWLEDGED" : input.status === "RESOLVED" ? "RESOLVED" : "REOPENED",
    input.userId,
    input.note ?? "",
    now
  ).run();
  return true;
}

export async function resolveBillingAlertsForInvoice(
  db: D1Database,
  invoiceId: string,
  userId: string,
  note: string,
  now: string
): Promise<void> {
  const alerts = await db.prepare(
    `SELECT id
     FROM billing_alerts
     WHERE invoice_id = ? AND status IN ('OPEN', 'ACKNOWLEDGED')`
  ).bind(invoiceId).all<{ id: string }>();
  for (const alert of alerts.results) {
    await updateBillingAlertStatus(db, alert.id, {
      status: "RESOLVED",
      userId,
      note
    }, now);
  }
}

export async function listBillingHistory(
  db: D1Database,
  studentId: string,
  limit = 100,
  providerEnvironment?: "sandbox" | "production" | null
): Promise<BillingHistoryItem[]> {
  const boundedLimit = Math.max(1, Math.min(limit, 5000));
  const invoiceEnvironmentFilter = providerEnvironment
    ? " AND (i.provider_environment = ? OR i.provider_environment IS NULL)"
    : "";
  const invoiceEnvironmentBindings = providerEnvironment ? [providerEnvironment] : [];
  const [lessonCharges, cancellations, credits, ledgerTransactions, invoices, payments] = await Promise.all([
    db.prepare(
      `SELECT e.id, 'LESSON_CHARGE' AS kind, COALESCE(e.lesson_date, e.created_at) AS occurred_at,
              e.student_id, s.name AS student_name, e.lesson_id, e.id AS billing_event_id,
              i.id AS invoice_id, NULL AS credit_id, e.gross_amount_minor AS amount_minor,
              e.status, 'Lesson charge' AS description, e.external_reference AS provider_reference,
              i.freeagent_url AS provider_url
       FROM billing_events e
       JOIN students s ON s.id = e.student_id
       LEFT JOIN billing_invoices i ON i.billing_event_id = e.id${invoiceEnvironmentFilter}
       WHERE e.student_id = ?
       ORDER BY occurred_at DESC, e.id DESC
       LIMIT ?`
    ).bind(...invoiceEnvironmentBindings, studentId, boundedLimit).all<BillingHistoryItem>(),
    db.prepare(
      `SELECT h.id, 'CANCELLATION' AS kind, h.created_at AS occurred_at,
              h.student_id, s.name AS student_name, h.lesson_id, NULL AS billing_event_id,
              NULL AS invoice_id, NULL AS credit_id, NULL AS amount_minor,
              h.event_type AS status, 'Lesson cancellation' AS description, NULL AS provider_reference, NULL AS provider_url
       FROM lesson_history h
       JOIN students s ON s.id = h.student_id
       WHERE h.student_id = ?
         AND h.event_type IN ('ADMIN_CANCELLED', 'STUDENT_CANCELLED', 'CANCELLATION_APPROVED')
       ORDER BY h.created_at DESC, h.id DESC
       LIMIT ?`
    ).bind(studentId, boundedLimit).all<BillingHistoryItem>(),
    db.prepare(
      `SELECT c.id, 'CREDIT' AS kind, c.created_at AS occurred_at,
              c.student_id, s.name AS student_name, c.source_lesson_id AS lesson_id,
              c.source_event_id AS billing_event_id, NULL AS invoice_id, c.id AS credit_id,
              c.original_amount_minor AS amount_minor, c.status,
              'Customer credit granted' AS description, c.freeagent_credit_note_reference AS provider_reference, c.freeagent_credit_note_url AS provider_url
       FROM customer_credits c
       JOIN students s ON s.id = c.student_id
       WHERE c.student_id = ?
       ORDER BY c.created_at DESC, c.id DESC
       LIMIT ?`
    ).bind(studentId, boundedLimit).all<BillingHistoryItem>(),
    db.prepare(
      `SELECT t.id,
              CASE WHEN t.transaction_type = 'CONSUMPTION' THEN 'CREDIT_CONSUMED' ELSE 'CREDIT' END AS kind,
              t.created_at AS occurred_at, c.student_id, s.name AS student_name,
              t.source_lesson_id AS lesson_id, t.source_event_id AS billing_event_id,
              t.invoice_id, c.id AS credit_id, t.amount_minor, t.transaction_type AS status,
              'Credit ledger transaction' AS description, t.provider_reference, NULL AS provider_url
       FROM credit_ledger_transactions t
       JOIN customer_credits c ON c.id = t.credit_id
       JOIN students s ON s.id = c.student_id
       WHERE c.student_id = ?
       ORDER BY t.created_at DESC, t.id DESC
       LIMIT ?`
    ).bind(studentId, boundedLimit).all<BillingHistoryItem>(),
    db.prepare(
      `SELECT i.id, 'INVOICE' AS kind, i.created_at AS occurred_at,
              i.student_id, s.name AS student_name, e.lesson_id,
              e.id AS billing_event_id, i.id AS invoice_id, NULL AS credit_id,
              i.net_amount_minor AS amount_minor, i.status, 'Invoice' AS description,
              i.freeagent_reference AS provider_reference, i.freeagent_url AS provider_url
       FROM billing_invoices i
       JOIN billing_events e ON e.id = i.billing_event_id
       JOIN students s ON s.id = i.student_id
       WHERE i.student_id = ?
         ${invoiceEnvironmentFilter}
       ORDER BY i.created_at DESC, i.id DESC
       LIMIT ?`
    ).bind(studentId, ...invoiceEnvironmentBindings, boundedLimit).all<BillingHistoryItem>(),
    db.prepare(
      `SELECT p.id, 'PAYMENT' AS kind, p.created_at AS occurred_at,
              i.student_id, s.name AS student_name, e.lesson_id,
              e.id AS billing_event_id, i.id AS invoice_id, NULL AS credit_id,
              i.net_amount_minor AS amount_minor, p.status,
              'Direct Debit collection' AS description, p.provider_reference, i.freeagent_url AS provider_url
       FROM billing_payments p
       JOIN billing_invoices i ON i.id = p.invoice_id
       JOIN billing_events e ON e.id = i.billing_event_id
       JOIN students s ON s.id = i.student_id
       WHERE i.student_id = ?
         ${invoiceEnvironmentFilter}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ?`
    ).bind(studentId, ...invoiceEnvironmentBindings, boundedLimit).all<BillingHistoryItem>()
  ]);
  return [
    ...lessonCharges.results,
    ...cancellations.results,
    ...credits.results,
    ...ledgerTransactions.results,
    ...invoices.results,
    ...payments.results
  ]
    .sort((left, right) => {
      if (left.occurred_at !== right.occurred_at) return left.occurred_at < right.occurred_at ? 1 : -1;
      if (left.id === right.id) return 0;
      return left.id < right.id ? 1 : -1;
    })
    .slice(0, boundedLimit);
}

export async function countBillingHistory(
  db: D1Database,
  studentId: string,
  providerEnvironment?: "sandbox" | "production" | null
): Promise<number> {
  const invoiceEnvironmentFilter = providerEnvironment
    ? " AND (i.provider_environment = ? OR i.provider_environment IS NULL)"
    : "";
  const invoiceEnvironmentBindings = providerEnvironment ? [providerEnvironment] : [];
  const counts = await Promise.all([
    db.prepare(
     `SELECT COUNT(*) AS count
      FROM billing_events e
      WHERE e.student_id = ?`
    ).bind(studentId).first<{ count: number | string }>(),
    db.prepare(
     `SELECT COUNT(*) AS count
      FROM lesson_history h
      WHERE h.student_id = ?
        AND h.event_type IN ('ADMIN_CANCELLED', 'STUDENT_CANCELLED', 'CANCELLATION_APPROVED')`
    ).bind(studentId).first<{ count: number | string }>(),
    db.prepare(
     `SELECT COUNT(*) AS count
      FROM customer_credits c
      WHERE c.student_id = ?`
    ).bind(studentId).first<{ count: number | string }>(),
    db.prepare(
     `SELECT COUNT(*) AS count
      FROM credit_ledger_transactions t
      JOIN customer_credits c ON c.id = t.credit_id
      WHERE c.student_id = ?`
    ).bind(studentId).first<{ count: number | string }>(),
    db.prepare(
     `SELECT COUNT(*) AS count
      FROM billing_invoices i
      WHERE i.student_id = ?
        ${invoiceEnvironmentFilter}`
    ).bind(studentId, ...invoiceEnvironmentBindings).first<{ count: number | string }>(),
    db.prepare(
     `SELECT COUNT(*) AS count
      FROM billing_payments p
      JOIN billing_invoices i ON i.id = p.invoice_id
      WHERE i.student_id = ?
        ${invoiceEnvironmentFilter}`
    ).bind(studentId, ...invoiceEnvironmentBindings).first<{ count: number | string }>()
  ]);
  return counts.reduce((total, row) => total + Number(row?.count ?? 0), 0);
}

export async function listUpcomingBillingRows(
  db: D1Database,
  startDate: string,
  endDate: string,
  studentId?: string,
  providerEnvironment?: "sandbox" | "production" | null
): Promise<Array<BillingHistoryItem & { collection_date: string | null; credit_available_minor: number | string; payment_status: string | null; mandate_state: string | null }>> {
  const result = await db.prepare(
    `SELECT e.id, 'LESSON_CHARGE' AS kind, COALESCE(e.lesson_date, e.created_at) AS occurred_at,
            e.student_id, s.name AS student_name, e.lesson_id, e.id AS billing_event_id,
            i.id AS invoice_id, NULL AS credit_id, e.gross_amount_minor AS amount_minor,
            COALESCE(i.net_amount_minor, e.net_amount_minor, e.gross_amount_minor) AS invoice_amount_minor,
            COALESCE(i.status, e.status) AS status, 'Upcoming lesson' AS description,
            COALESCE(i.freeagent_reference, e.external_reference) AS provider_reference,
            COALESCE(i.provider_status, e.provider_status) AS provider_status,
            e.collection_date, COALESCE(a.available_minor, 0) AS credit_available_minor,
            p.status AS payment_status, ba.mandate_state
     FROM billing_events e
     JOIN students s ON s.id = e.student_id
     LEFT JOIN billing_invoices i ON i.billing_event_id = e.id
       ${providerEnvironment ? "AND (i.provider_environment = ? OR i.provider_environment IS NULL)" : ""}
     LEFT JOIN customer_credit_accounts a ON a.student_id = e.payer_student_id
     LEFT JOIN billing_accounts ba ON ba.student_id = e.payer_student_id
     LEFT JOIN billing_payments p ON p.invoice_id = i.id
     WHERE e.lesson_date >= ? AND e.lesson_date < ? AND e.status != 'CANCELLED'
       AND (? IS NULL OR e.student_id = ?)
     ORDER BY e.lesson_date ASC, e.id ASC`
  ).bind(
    ...(providerEnvironment ? [providerEnvironment] : []),
    startDate,
    endDate,
    studentId ?? null,
    studentId ?? null
  ).all<BillingHistoryItem & { collection_date: string | null; credit_available_minor: number | string; payment_status: string | null; mandate_state: string | null }>();
  return result.results;
}

export async function createBillingReconciliationTask(
  db: D1Database,
  input: {
    id: string;
    taskType: BillingReconciliationTask["task_type"];
    deduplicationKey: string;
    studentId?: string | null;
    lessonId?: string | null;
    billingEventId?: string | null;
    invoiceId?: string | null;
    creditId?: string | null;
    providerReference?: string | null;
    now: string;
  }
): Promise<void> {
  await db.prepare(
    `INSERT INTO billing_reconciliation_tasks
     (id, task_type, student_id, lesson_id, billing_event_id, invoice_id, credit_id,
      provider_reference, deduplication_key, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
     ON CONFLICT(deduplication_key) DO UPDATE SET
       provider_reference = COALESCE(excluded.provider_reference, billing_reconciliation_tasks.provider_reference),
       status = CASE WHEN billing_reconciliation_tasks.status = 'SUCCEEDED' THEN 'SUCCEEDED' ELSE 'PENDING' END,
       updated_at = excluded.updated_at`
  ).bind(
    input.id, input.taskType, input.studentId ?? null, input.lessonId ?? null,
    input.billingEventId ?? null, input.invoiceId ?? null, input.creditId ?? null,
    input.providerReference ?? null, input.deduplicationKey, input.now, input.now
  ).run();
}

export async function listDueBillingReconciliationTasks(db: D1Database, now: string, limit = 50): Promise<BillingReconciliationTask[]> {
  const result = await db.prepare(
    `SELECT * FROM billing_reconciliation_tasks
     WHERE status IN ('PENDING', 'FAILED') AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
     ORDER BY created_at ASC, id ASC LIMIT ?`
  ).bind(now, limit).all<BillingReconciliationTask>();
  return result.results;
}

export async function listCustomerCreditBalances(db: D1Database, limit = 100): Promise<CustomerCreditBalance[]> {
  const result = await db.prepare(
    `SELECT c.*, s.name AS student_name
     FROM customer_credit_balances c
     LEFT JOIN students s ON s.id = c.student_id
     ORDER BY c.created_at ASC, c.credit_id ASC
     LIMIT ?`
  ).bind(Math.max(1, Math.min(limit, 500))).all<CustomerCreditBalance & { student_name?: string | null }>();
  return result.results.map((row) => ({
    ...row,
    creditId: row.credit_id,
    remainingMinor: asMinor(row.remaining_amount_minor),
    createdAt: row.created_at
  }));
}
