import type { BillingConsequence } from "../domain/cancellations";
import { accountingOutboxStatement } from "./accounting";
import { cancellationCreditStatements, invoiceCancellationStatement } from "./billing";
import { collectionDateSevenDaysBeforeLesson } from "../domain/billing";
import { FOX_TUTOR_TIMEZONE } from "../domain/calendar";

export type CancellationRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type LessonHistoryEventType =
  | "STUDENT_CANCELLED"
  | "CANCELLATION_REQUESTED"
  | "CANCELLATION_APPROVED"
  | "CANCELLATION_REJECTED"
  | "CANCELLATION_UNDONE"
  | "ADMIN_CANCELLED"
  | "RESCHEDULED";

export interface CancellationRequest {
  id: string;
  lesson_id: string;
  student_id: string;
  requested_by_user_id: string;
  reason: string;
  status: CancellationRequestStatus;
  created_at: string;
  updated_at: string;
  decided_at: string | null;
  decided_by_user_id: string | null;
  decision_reason: string | null;
  student_name?: string;
  lesson_start_at?: string;
  lesson_end_at?: string;
  lesson_timezone?: string;
}

export interface LessonHistory {
  id: string;
  lesson_id: string;
  student_id: string;
  request_id: string | null;
  initiated_by_user_id: string | null;
  actor_role: "ADMIN" | "STUDENT" | "SYSTEM";
  event_type: LessonHistoryEventType;
  requested_at: string | null;
  decided_at: string | null;
  decision: string | null;
  reason: string | null;
  billing_consequence: BillingConsequence | null;
  previous_start_at: string | null;
  previous_end_at: string | null;
  previous_timezone: string | null;
  new_start_at: string | null;
  new_end_at: string | null;
  new_timezone: string | null;
  resulting_lesson_status: "scheduled" | "completed" | "cancelled";
  created_at: string;
  actor_name?: string;
}

export type CancellationBillingOutcome =
  | { kind: "NOT_INVOICED" }
  | { kind: "CANCELLATION_PENDING_PROVIDER" }
  | { kind: "PAYMENT_IN_TRANSIT"; amountMinor: bigint; invoiceReference: string | null }
  | { kind: "CREDIT_GRANTED"; amountMinor: bigint; invoiceReference: string | null }
  | { kind: "RECONCILIATION_REQUIRED" };

export async function findCancellationBillingOutcome(
  db: D1Database,
  lessonId: string
): Promise<CancellationBillingOutcome> {
  const row = await db.prepare(
    `SELECT i.id AS invoice_id, i.status AS invoice_status, i.provider_status,
            i.freeagent_reference,
            EXISTS (
              SELECT 1 FROM billing_invoice_operations op
              WHERE op.invoice_id = i.id AND op.operation_type = 'CANCEL_INVOICE'
                AND op.status IN ('PENDING', 'PROCESSING', 'RETRYABLE')
            ) AS cancellation_pending,
            EXISTS (
              SELECT 1 FROM billing_invoice_operations op
              WHERE op.invoice_id = i.id AND op.operation_type = 'INITIATE_DIRECT_DEBIT'
                AND op.status IN ('PROCESSING', 'SUCCEEDED', 'UNKNOWN')
            ) OR EXISTS (
              SELECT 1 FROM billing_payments p
              WHERE p.invoice_id = i.id
                AND p.status IN ('SCHEDULED', 'SUBMITTED', 'PENDING', 'CONFIRMED', 'UNKNOWN')
            ) AS collection_started,
            EXISTS (
              SELECT 1 FROM billing_invoice_operations op
              WHERE op.invoice_id = i.id AND op.operation_type = 'INITIATE_DIRECT_DEBIT'
                AND op.status IN ('PROCESSING', 'SUCCEEDED')
            ) OR EXISTS (
              SELECT 1 FROM billing_payments p
              WHERE p.invoice_id = i.id
                AND p.status IN ('SCHEDULED', 'SUBMITTED', 'PENDING', 'CONFIRMED')
            ) AS credit_eligible,
            EXISTS (
              SELECT 1 FROM billing_invoice_operations op
              WHERE op.invoice_id = i.id AND op.operation_type = 'INITIATE_DIRECT_DEBIT'
                AND op.status = 'UNKNOWN'
            ) OR EXISTS (
              SELECT 1 FROM billing_payments p
              WHERE p.invoice_id = i.id AND p.status = 'UNKNOWN'
            ) AS collection_unknown,
            EXISTS (
              SELECT 1 FROM billing_payments p
              WHERE p.invoice_id = i.id AND p.status = 'CONFIRMED'
            ) OR i.status = 'PAID' AS payment_confirmed,
            (SELECT c.original_amount_minor FROM customer_credits c
             WHERE c.source_lesson_id = ? ORDER BY c.created_at DESC LIMIT 1) AS credit_amount_minor
     FROM billing_invoices i
     JOIN billing_events e ON e.id = i.billing_event_id
     WHERE e.lesson_id = ?
     LIMIT 1`
  ).bind(lessonId, lessonId).first<{
    invoice_id: string | null;
    invoice_status: string | null;
    provider_status: string | null;
    freeagent_reference: string | null;
    cancellation_pending: number;
    collection_started: number;
    credit_eligible: number;
    collection_unknown: number;
    payment_confirmed: number;
    credit_amount_minor: number | string | null;
  }>();
  if (!row) return { kind: "NOT_INVOICED" };
  if (row.provider_status === "RECONCILIATION_REQUIRED" || row.provider_status === "CANCELLATION_RECONCILIATION_REQUIRED") {
    return { kind: "RECONCILIATION_REQUIRED" };
  }
  if (row.credit_amount_minor !== null && row.payment_confirmed) {
    return {
      kind: "CREDIT_GRANTED",
      amountMinor: BigInt(row.credit_amount_minor),
      invoiceReference: row.freeagent_reference
    };
  }
  if (row.collection_started) {
    return {
      kind: "PAYMENT_IN_TRANSIT",
      amountMinor: row.credit_amount_minor === null ? 0n : BigInt(row.credit_amount_minor),
      invoiceReference: row.freeagent_reference
    };
  }
  if (row.cancellation_pending || row.invoice_status === "SENT" || row.invoice_status === "PAYMENT_PENDING") {
    return { kind: "CANCELLATION_PENDING_PROVIDER" };
  }
  return { kind: "NOT_INVOICED" };
}

export async function findPendingCancellationRequestForLesson(db: D1Database, lessonId: string): Promise<CancellationRequest | null> {
  return db.prepare(
    `SELECT r.*, s.name AS student_name, l.start_at AS lesson_start_at, l.end_at AS lesson_end_at, l.timezone AS lesson_timezone
     FROM lesson_cancellation_requests r
     JOIN students s ON s.id = r.student_id
     JOIN lessons l ON l.id = r.lesson_id
     WHERE r.lesson_id = ? AND r.status = 'PENDING'`
  ).bind(lessonId).first<CancellationRequest>();
}

export async function findCancellationRequest(db: D1Database, id: string): Promise<CancellationRequest | null> {
  return db.prepare(
    `SELECT r.*, s.name AS student_name, l.start_at AS lesson_start_at, l.end_at AS lesson_end_at, l.timezone AS lesson_timezone
     FROM lesson_cancellation_requests r
     JOIN students s ON s.id = r.student_id
     JOIN lessons l ON l.id = r.lesson_id
     WHERE r.id = ?`
  ).bind(id).first<CancellationRequest>();
}

export async function listPendingCancellationRequests(db: D1Database): Promise<CancellationRequest[]> {
  const result = await db.prepare(
    `SELECT r.*, s.name AS student_name, l.start_at AS lesson_start_at, l.end_at AS lesson_end_at, l.timezone AS lesson_timezone
     FROM lesson_cancellation_requests r
     JOIN students s ON s.id = r.student_id
     JOIN lessons l ON l.id = r.lesson_id
     WHERE r.status = 'PENDING'
     ORDER BY r.created_at ASC, r.id ASC`
  ).all<CancellationRequest>();
  return result.results;
}

export async function countPendingCancellationRequests(db: D1Database): Promise<number> {
  const row = await db.prepare("SELECT COUNT(*) AS count FROM lesson_cancellation_requests WHERE status = 'PENDING'")
    .first<{ count: number | string }>();
  return Number(row?.count ?? 0);
}

export async function listLessonHistory(db: D1Database, lessonId: string): Promise<LessonHistory[]> {
  const result = await db.prepare(
    `SELECT h.*, u.display_name AS actor_name
     FROM lesson_history h
     LEFT JOIN users u ON u.id = h.initiated_by_user_id
     WHERE h.lesson_id = ?
     ORDER BY h.created_at DESC, h.id DESC`
  ).bind(lessonId).all<LessonHistory>();
  return result.results;
}

export async function listStudentCancellationRequests(db: D1Database, studentId: string): Promise<CancellationRequest[]> {
  const result = await db.prepare(
    `SELECT r.*, s.name AS student_name, l.start_at AS lesson_start_at, l.end_at AS lesson_end_at, l.timezone AS lesson_timezone
     FROM lesson_cancellation_requests r
     JOIN students s ON s.id = r.student_id
     JOIN lessons l ON l.id = r.lesson_id
     WHERE r.student_id = ?
     ORDER BY r.created_at DESC, r.id DESC`
  ).bind(studentId).all<CancellationRequest>();
  return result.results;
}

export async function createCancellationRequest(
  db: D1Database,
  input: { id: string; lessonId: string; studentId: string; userId: string; reason: string; now: string }
): Promise<CancellationRequest | null> {
  await db.batch([
    db.prepare(
      `INSERT INTO lesson_cancellation_requests
       (id, lesson_id, student_id, requested_by_user_id, reason, status, created_at, updated_at)
       SELECT ?, l.id, l.student_id, ?, ?, 'PENDING', ?, ?
       FROM lessons l
       WHERE l.id = ? AND l.student_id = ? AND l.status = 'scheduled'
       ON CONFLICT DO NOTHING`
    ).bind(input.id, input.userId, input.reason, input.now, input.now, input.lessonId, input.studentId),
    db.prepare(
      `INSERT INTO lesson_history
       (id, lesson_id, student_id, request_id, initiated_by_user_id, actor_role, event_type, requested_at,
        reason, billing_consequence, resulting_lesson_status, created_at)
       SELECT ?, r.lesson_id, r.student_id, r.id, r.requested_by_user_id, 'STUDENT', 'CANCELLATION_REQUESTED', r.created_at, r.reason, 'CANCELLATION_PENDING_DECISION', 'scheduled', ?
       FROM lesson_cancellation_requests r
       WHERE r.lesson_id = ? AND r.status = 'PENDING'
       ON CONFLICT DO NOTHING`
    ).bind(crypto.randomUUID(), input.now, input.lessonId)
  ]);
  return findPendingCancellationRequestForLesson(db, input.lessonId);
}

export async function cancelLesson(
  db: D1Database,
  input: {
    lessonId: string;
    studentId: string;
    actorUserId: string;
    actorRole: "ADMIN" | "STUDENT";
    eventType: "STUDENT_CANCELLED" | "ADMIN_CANCELLED" | "CANCELLATION_APPROVED";
    billingConsequence: BillingConsequence;
    requestId?: string;
    reason?: string;
    now: string;
    previousStartAt: string;
    previousEndAt: string;
    previousTimezone: string;
    creditAmountMinor?: bigint | null;
    payerStudentId?: string;
  }
): Promise<boolean> {
  if (input.previousTimezone !== FOX_TUTOR_TIMEZONE) {
    throw new Error(`FoxTutor lessons always use ${FOX_TUTOR_TIMEZONE}.`);
  }
  const billedInvoice = input.eventType === "ADMIN_CANCELLED"
    ? await db.prepare(
      `SELECT i.id, i.status, i.freeagent_url,
         EXISTS (
           SELECT 1 FROM billing_invoice_operations op
           WHERE op.invoice_id = i.id AND op.operation_type = 'INITIATE_DIRECT_DEBIT'
             AND op.status IN ('PROCESSING', 'SUCCEEDED', 'UNKNOWN')
         ) OR EXISTS (
           SELECT 1 FROM billing_payments p
           WHERE p.invoice_id = i.id
             AND p.status IN ('SCHEDULED', 'SUBMITTED', 'PENDING', 'CONFIRMED', 'UNKNOWN')
         ) AS collection_started,
         EXISTS (
           SELECT 1 FROM billing_invoice_operations op
           WHERE op.invoice_id = i.id AND op.operation_type = 'INITIATE_DIRECT_DEBIT'
             AND op.status IN ('PROCESSING', 'SUCCEEDED')
         ) OR EXISTS (
           SELECT 1 FROM billing_payments p
           WHERE p.invoice_id = i.id
             AND p.status IN ('SCHEDULED', 'SUBMITTED', 'PENDING', 'CONFIRMED')
         ) AS credit_eligible,
         EXISTS (
           SELECT 1 FROM billing_invoice_operations op
           WHERE op.invoice_id = i.id AND op.operation_type = 'INITIATE_DIRECT_DEBIT'
             AND op.status = 'UNKNOWN'
         ) OR EXISTS (
           SELECT 1 FROM billing_payments p
           WHERE p.invoice_id = i.id AND p.status = 'UNKNOWN'
         ) AS collection_unknown
      FROM billing_invoices i
       JOIN billing_events e ON e.id = i.billing_event_id
       WHERE e.lesson_id = ?
       LIMIT 1`
    ).bind(input.lessonId).first<{
      id: string;
      status: string;
      freeagent_url: string | null;
      collection_started: number;
      credit_eligible: number;
      collection_unknown: number;
    }>()
    : null;
  const providerCorrectionRequired = Boolean(
    billedInvoice && billedInvoice.collection_started && ["SENT", "PAYMENT_PENDING", "PAID", "FAILED", "UNKNOWN"].includes(billedInvoice.status)
  );
  const providerInvoiceCancellationRequired = Boolean(
    billedInvoice && !billedInvoice.collection_started && billedInvoice.freeagent_url
     && ["SENT", "PAYMENT_PENDING"].includes(billedInvoice.status)
  );
  const historyId = crypto.randomUUID();
  const accountingStatement = accountingOutboxStatement(db, {
    id: crypto.randomUUID(),
    historyId,
    historyEventType: input.eventType,
    lessonId: input.lessonId,
    studentId: input.studentId,
    billingConsequence: input.billingConsequence,
    accountingEffectiveDate: input.now.slice(0, 10),
    now: input.now
  });
  const creditStatements = input.eventType === "ADMIN_CANCELLED" && input.creditAmountMinor && billedInvoice?.credit_eligible
    ? cancellationCreditStatements(db, {
      creditId: `credit-${historyId}`,
      accountId: `credit-account-${input.payerStudentId ?? input.studentId}`,
      studentId: input.studentId,
      payerStudentId: input.payerStudentId ?? input.studentId,
      sourceEventId: historyId,
      lessonId: input.lessonId,
      cancellationId: historyId,
      amountMinor: input.creditAmountMinor,
      now: input.now,
      createProviderOperation: providerCorrectionRequired
    })
    : [];
  const results = await db.batch([
    db.prepare("UPDATE lessons SET status = 'cancelled', updated_at = ? WHERE id = ? AND status = 'scheduled'")
      .bind(input.now, input.lessonId),
    db.prepare(
      `INSERT INTO lesson_history
       (id, lesson_id, student_id, request_id, initiated_by_user_id, actor_role, event_type, requested_at, decided_at,
        decision, reason, billing_consequence, previous_start_at, previous_end_at, previous_timezone,
        resulting_lesson_status, created_at)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cancelled', ?
       WHERE changes() > 0`
    ).bind(
      historyId,
      input.lessonId,
      input.studentId,
      input.requestId ?? null,
      input.actorUserId,
      input.actorRole,
      input.eventType,
      input.now,
      input.eventType === "CANCELLATION_APPROVED" ? input.now : null,
      input.eventType === "CANCELLATION_APPROVED" ? "APPROVED" : "CANCELLED",
      input.reason ?? null,
      input.billingConsequence,
      input.previousStartAt,
      input.previousEndAt,
      input.previousTimezone,
      input.now
    ),
    ...(input.eventType === "ADMIN_CANCELLED" ? [
      db.prepare(
        `UPDATE billing_events
         SET status = CASE WHEN ? THEN status ELSE 'CANCELLED' END,
             updated_at = ?,
             provider_status = CASE
               WHEN ? THEN CASE WHEN ? THEN 'CANCELLATION_RECONCILIATION_REQUIRED' ELSE 'PAYMENT_IN_TRANSIT' END
               ELSE provider_status END
         WHERE lesson_id = ? AND status != 'CANCELLED'`
      ).bind(providerCorrectionRequired ? 1 : 0, input.now, providerCorrectionRequired ? 1 : 0, billedInvoice?.collection_unknown ? 1 : 0, input.lessonId),
      ...(providerCorrectionRequired ? [db.prepare(
        `UPDATE billing_invoices
         SET provider_status = CASE WHEN ? THEN 'CANCELLATION_RECONCILIATION_REQUIRED' ELSE 'PAYMENT_IN_TRANSIT' END, updated_at = ?
         WHERE id = ?`
      ).bind(billedInvoice?.collection_unknown ? 1 : 0, input.now, billedInvoice?.id ?? "")] : [])
      ,
      ...(providerInvoiceCancellationRequired ? [db.prepare(
        `UPDATE billing_invoices
         SET provider_status = 'CANCELLATION_PENDING', updated_at = ?
         WHERE id = ?`
      ).bind(input.now, billedInvoice!.id)] : []),
      ...(providerInvoiceCancellationRequired ? [invoiceCancellationStatement(db, billedInvoice!.id, input.now)] : [])
    ] : []),
    ...creditStatements,
    ...(accountingStatement ? [accountingStatement] : [])
  ]);
  return Boolean(results[0]?.meta.changes);
}

export async function undoStudentCancellation(
  db: D1Database,
  input: {
    lessonId: string;
    studentId: string;
    actorUserId: string;
    now: string;
    startAt: string;
    endAt: string;
    timezone: string;
  }
): Promise<boolean> {
  const results = await db.batch([
    db.prepare(
      `UPDATE lessons
       SET status = 'scheduled', updated_at = ?
       WHERE id = ? AND student_id = ? AND status = 'cancelled'
         AND EXISTS (
           SELECT 1 FROM lesson_history h
           WHERE h.lesson_id = ? AND h.student_id = ? AND h.event_type = 'STUDENT_CANCELLED'
             AND h.actor_role = 'STUDENT' AND h.initiated_by_user_id = ?
             AND NOT EXISTS (
               SELECT 1 FROM lesson_history later
               WHERE later.lesson_id = h.lesson_id
                 AND later.event_type IN ('ADMIN_CANCELLED', 'CANCELLATION_APPROVED')
                 AND later.created_at >= h.created_at
             )
         )`
    ).bind(input.now, input.lessonId, input.studentId, input.lessonId, input.studentId, input.actorUserId),
    db.prepare(
      `INSERT INTO lesson_history
       (id, lesson_id, student_id, initiated_by_user_id, actor_role, event_type, reason,
        previous_start_at, previous_end_at, previous_timezone, resulting_lesson_status, created_at)
       SELECT ?, ?, ?, ?, 'STUDENT', 'CANCELLATION_UNDONE', 'Student restored lesson', ?, ?, ?, 'scheduled', ?
       WHERE changes() > 0`
    ).bind(crypto.randomUUID(), input.lessonId, input.studentId, input.actorUserId, input.startAt, input.endAt, input.timezone, input.now)
  ]);
  return Boolean(results[0]?.meta.changes);
}

export async function decideCancellationRequest(
  db: D1Database,
  input: {
    requestId: string;
    lessonId: string;
    studentId: string;
    adminUserId: string;
    decision: "APPROVED" | "REJECTED";
    decisionReason: string;
    billingConsequence: BillingConsequence | null;
    previousStartAt: string;
    previousEndAt: string;
    previousTimezone: string;
    now: string;
  }
): Promise<boolean> {
  const historyId = crypto.randomUUID();
  const accountingStatement = input.decision === "APPROVED"
    ? accountingOutboxStatement(db, {
      id: crypto.randomUUID(),
      historyId,
      historyEventType: "CANCELLATION_APPROVED",
      lessonId: input.lessonId,
      studentId: input.studentId,
      billingConsequence: input.billingConsequence ?? "EXCEPTION_WAIVED",
      accountingEffectiveDate: input.now.slice(0, 10),
      now: input.now
    })
    : null;
  const results = await db.batch([
    db.prepare(
      `UPDATE lesson_cancellation_requests
       SET status = ?, updated_at = ?, decided_at = ?, decided_by_user_id = ?, decision_reason = ?
       WHERE id = ? AND status = 'PENDING'
         AND (? = 'REJECTED' OR EXISTS (SELECT 1 FROM lessons WHERE id = ? AND status = 'scheduled'))`
    ).bind(input.decision, input.now, input.now, input.adminUserId, input.decisionReason || null, input.requestId, input.decision, input.lessonId),
    ...(input.decision === "APPROVED"
      ? [db.prepare("UPDATE lessons SET status = 'cancelled', updated_at = ? WHERE id = ? AND status = 'scheduled'").bind(input.now, input.lessonId)]
      : []),
    db.prepare(
      `INSERT INTO lesson_history
       (id, lesson_id, student_id, request_id, initiated_by_user_id, actor_role, event_type, requested_at, decided_at,
        decision, reason, billing_consequence, previous_start_at, previous_end_at, previous_timezone,
        resulting_lesson_status, created_at)
       SELECT ?, ?, ?, ?, ?, 'ADMIN', ?, r.created_at, ?, ?, r.reason, ?, ?, ?, ?, ?, ?
       FROM lesson_cancellation_requests r
        WHERE r.id = ? AND r.status = ? AND changes() > 0
        ON CONFLICT DO NOTHING`
    ).bind(
      historyId,
      input.lessonId,
      input.studentId,
      input.requestId,
      input.adminUserId,
      input.decision === "APPROVED" ? "CANCELLATION_APPROVED" : "CANCELLATION_REJECTED",
      input.now,
      input.decision,
      input.billingConsequence,
      input.previousStartAt,
      input.previousEndAt,
      input.previousTimezone,
      input.decision === "APPROVED" ? "cancelled" : "scheduled",
      input.now,
      input.requestId,
      input.decision
    ),
    ...(accountingStatement ? [accountingStatement] : [])
  ]);
  return Boolean(results[0]?.meta.changes);
}

export async function rescheduleLesson(
  db: D1Database,
  input: {
    lessonId: string;
    studentId: string;
    actorUserId: string;
    actorRole: "ADMIN" | "STUDENT";
    startAt: string;
    endAt: string;
    timezone: string;
    reason: string;
    previousStartAt: string;
    previousEndAt: string;
    previousTimezone: string;
    now: string;
  }
): Promise<boolean> {
  const historyId = crypto.randomUUID();
  const accountingStatement = accountingOutboxStatement(db, {
    id: crypto.randomUUID(),
    historyId,
    historyEventType: "RESCHEDULED",
    lessonId: input.lessonId,
    studentId: input.studentId,
    billingConsequence: "RESCHEDULED",
    accountingEffectiveDate: input.now.slice(0, 10),
    now: input.now
  });
  const results = await db.batch([
    db.prepare(
      `UPDATE lessons
       SET start_at = ?, end_at = ?, timezone = ?,
           instance_override = CASE WHEN recurring_series_id IS NULL THEN instance_override ELSE 1 END,
           updated_at = ?
       WHERE id = ? AND student_id = ? AND status = 'scheduled'
         AND start_at = ? AND end_at = ? AND timezone = ?`
    ).bind(
      input.startAt, input.endAt, input.timezone, input.now, input.lessonId, input.studentId,
      input.previousStartAt, input.previousEndAt, input.previousTimezone
    ),
    db.prepare(
      `INSERT INTO lesson_history
       (id, lesson_id, student_id, initiated_by_user_id, actor_role, event_type, reason, billing_consequence,
        previous_start_at, previous_end_at, previous_timezone, new_start_at, new_end_at, new_timezone,
        resulting_lesson_status, created_at)
       SELECT ?, ?, ?, ?, ?, 'RESCHEDULED', ?, 'RESCHEDULED', ?, ?, ?, ?, ?, ?, 'scheduled', ?
       WHERE changes() > 0`
    ).bind(
      historyId, input.lessonId, input.studentId, input.actorUserId, input.actorRole, input.reason,
      input.previousStartAt, input.previousEndAt, input.previousTimezone,
      input.startAt, input.endAt, input.timezone, input.now
    ),
    db.prepare(
      `UPDATE billing_events
       SET lesson_date = ?, billing_date = ?, collection_date = ?, updated_at = ?
       WHERE lesson_id = ? AND status IN ('PENDING', 'INVOICE_PENDING')`
    ).bind(
      input.startAt.slice(0, 10),
      input.startAt.slice(0, 10),
      collectionDateSevenDaysBeforeLesson(input.startAt.slice(0, 10)),
      input.now,
      input.lessonId
    ),
    ...(accountingStatement ? [accountingStatement] : [])
  ]);
  return Boolean(results[0]?.meta.changes);
}
