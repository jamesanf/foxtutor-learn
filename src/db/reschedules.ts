export type RescheduleRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface RescheduleRequest {
  id: string;
  lesson_id: string;
  student_id: string;
  requested_by_user_id: string;
  requested_start_at: string;
  requested_end_at: string;
  requested_timezone: string;
  reason: string | null;
  status: RescheduleRequestStatus;
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

const requestSelect = `SELECT r.*, s.name AS student_name, l.start_at AS lesson_start_at,
  l.end_at AS lesson_end_at, l.timezone AS lesson_timezone
  FROM lesson_reschedule_requests r
  JOIN students s ON s.id = r.student_id
  JOIN lessons l ON l.id = r.lesson_id`;

export async function findPendingRescheduleRequestForLesson(db: D1Database, lessonId: string): Promise<RescheduleRequest | null> {
  return db.prepare(`${requestSelect} WHERE r.lesson_id = ? AND r.status = 'PENDING'`).bind(lessonId).first<RescheduleRequest>();
}

export async function listPendingRescheduleRequests(db: D1Database): Promise<RescheduleRequest[]> {
  const result = await db.prepare(`${requestSelect} WHERE r.status = 'PENDING' ORDER BY r.created_at ASC, r.id ASC`).all<RescheduleRequest>();
  return result.results;
}

export async function countPendingRescheduleRequests(db: D1Database): Promise<number> {
  const row = await db.prepare("SELECT COUNT(*) AS count FROM lesson_reschedule_requests WHERE status = 'PENDING'")
    .first<{ count: number | string }>();
  return Number(row?.count ?? 0);
}

export async function findRescheduleRequest(db: D1Database, id: string): Promise<RescheduleRequest | null> {
  return db.prepare(`${requestSelect} WHERE r.id = ?`).bind(id).first<RescheduleRequest>();
}

export async function createRescheduleRequest(
  db: D1Database,
  input: {
    id: string;
    lessonId: string;
    studentId: string;
    userId: string;
    startAt: string;
    endAt: string;
    timezone: string;
    reason: string | null;
    now: string;
  }
): Promise<RescheduleRequest | null> {
  await db.prepare(
    `INSERT INTO lesson_reschedule_requests
     (id, lesson_id, student_id, requested_by_user_id, requested_start_at, requested_end_at,
      requested_timezone, reason, status, created_at, updated_at)
     SELECT ?, l.id, l.student_id, ?, ?, ?, ?, ?, 'PENDING', ?, ?
     FROM lessons l
     WHERE l.id = ? AND l.student_id = ? AND l.status = 'scheduled'
     ON CONFLICT DO NOTHING`
  ).bind(
    input.id, input.userId, input.startAt, input.endAt, input.timezone, input.reason,
    input.now, input.now, input.lessonId, input.studentId
  ).run();
  return findPendingRescheduleRequestForLesson(db, input.lessonId);
}

export async function decideRescheduleRequest(
  db: D1Database,
  input: {
    requestId: string;
    lessonId: string;
    studentId: string;
    adminUserId: string;
    decision: "APPROVED" | "REJECTED";
    decisionReason: string;
    previousStartAt: string;
    previousEndAt: string;
    previousTimezone: string;
    now: string;
  }
): Promise<boolean> {
  const approvalStatements = input.decision === "APPROVED"
    ? [
      db.prepare(
        `UPDATE lessons
         SET start_at = (SELECT requested_start_at FROM lesson_reschedule_requests WHERE id = ? AND status = 'PENDING'),
             end_at = (SELECT requested_end_at FROM lesson_reschedule_requests WHERE id = ? AND status = 'PENDING'),
             timezone = (SELECT requested_timezone FROM lesson_reschedule_requests WHERE id = ? AND status = 'PENDING'),
             updated_at = ?
         WHERE id = ? AND student_id = ? AND status = 'scheduled'
           AND start_at = ? AND end_at = ? AND timezone = ?
           AND EXISTS (SELECT 1 FROM lesson_reschedule_requests WHERE id = ? AND status = 'PENDING')`
      ).bind(
        input.requestId, input.requestId, input.requestId, input.now, input.lessonId, input.studentId,
        input.previousStartAt, input.previousEndAt, input.previousTimezone, input.requestId
      ),
      db.prepare(
        `UPDATE lesson_reschedule_requests
         SET status = 'APPROVED', updated_at = ?, decided_at = ?, decided_by_user_id = ?, decision_reason = ?
         WHERE id = ? AND status = 'PENDING'
           AND EXISTS (
             SELECT 1 FROM lessons
             WHERE id = ? AND student_id = ? AND status = 'scheduled'
               AND start_at = requested_start_at AND end_at = requested_end_at AND timezone = requested_timezone
           )`
      ).bind(input.now, input.now, input.adminUserId, input.decisionReason || null, input.requestId, input.lessonId, input.studentId),
      db.prepare(
        `INSERT INTO lesson_history
         (id, lesson_id, student_id, initiated_by_user_id, actor_role, event_type, reason,
          billing_consequence, previous_start_at, previous_end_at, previous_timezone,
          new_start_at, new_end_at, new_timezone, resulting_lesson_status, created_at)
         SELECT ?, ?, ?, ?, 'ADMIN', 'RESCHEDULED', 'Approved student reschedule request',
          'RESCHEDULED', ?, ?, ?, requested_start_at, requested_end_at, requested_timezone,
          'scheduled', ?
         FROM lesson_reschedule_requests
         WHERE id = ? AND status = 'APPROVED' AND changes() > 0
         ON CONFLICT DO NOTHING`
      ).bind(
        crypto.randomUUID(), input.lessonId, input.studentId, input.adminUserId,
        input.previousStartAt, input.previousEndAt, input.previousTimezone,
        input.now, input.requestId
      )
    ]
    : [
      db.prepare(
        `UPDATE lesson_reschedule_requests
         SET status = 'REJECTED', updated_at = ?, decided_at = ?, decided_by_user_id = ?, decision_reason = ?
         WHERE id = ? AND status = 'PENDING'`
      ).bind(input.now, input.now, input.adminUserId, input.decisionReason || null, input.requestId)
    ];
  const results = await db.batch(approvalStatements);
  return Boolean(results[0]?.meta.changes);
}
