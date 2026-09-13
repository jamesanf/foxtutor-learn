import type { BillingConsequence } from "../domain/cancellations";

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
  }
): Promise<boolean> {
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
      crypto.randomUUID(),
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
    )
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
      crypto.randomUUID(),
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
    )
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
  const results = await db.batch([
    db.prepare(
      `UPDATE lessons
       SET start_at = ?, end_at = ?, timezone = ?, updated_at = ?
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
      crypto.randomUUID(), input.lessonId, input.studentId, input.actorUserId, input.actorRole, input.reason,
      input.previousStartAt, input.previousEndAt, input.previousTimezone,
      input.startAt, input.endAt, input.timezone, input.now
    )
  ]);
  return Boolean(results[0]?.meta.changes);
}
