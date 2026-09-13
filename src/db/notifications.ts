import type { NotificationStatus, NotificationType } from "../domain/notifications";

export interface Notification {
  id: string;
  event_type: NotificationType;
  event_id: string;
  recipient_user_id: string;
  student_id: string | null;
  lesson_id: string | null;
  resource_id: string | null;
  report_id: string | null;
  status: NotificationStatus;
  idempotency_key: string;
  subject: string;
  text_body: string;
  html_body: string;
  provider_reference: string | null;
  attempt_count: number;
  error_category: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  last_attempted_at: string | null;
  scheduled_at: string | null;
  next_attempt_at: string | null;
  recipient_email?: string;
  student_name?: string;
  lesson_start_at?: string;
}

export interface NotificationInsert {
  id: string;
  eventType: NotificationType;
  eventId: string;
  recipientUserId: string;
  studentId?: string | null;
  lessonId?: string | null;
  resourceId?: string | null;
  reportId?: string | null;
  status?: NotificationStatus;
  idempotencyKey: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  createdAt: string;
  scheduledAt?: string | null;
  nextAttemptAt?: string | null;
}

export async function findNotificationById(db: D1Database, id: string): Promise<Notification | null> {
  return db.prepare(
    "SELECT n.*, u.email AS recipient_email FROM notifications n JOIN users u ON u.id = n.recipient_user_id WHERE n.id = ?"
  ).bind(id).first<Notification>();
}

export async function updateNotificationSchedule(
  db: D1Database,
  id: string,
  scheduledAt: string | null,
  now: string
): Promise<boolean> {
  const result = await db.prepare(
    `UPDATE notifications
     SET scheduled_at = ?, next_attempt_at = ?, updated_at = ?
     WHERE id = ? AND status = 'PENDING'`
  ).bind(scheduledAt, scheduledAt ?? now, now, id).run();
  return Boolean(result.meta.changes);
}

export async function updatePendingNotificationContent(
  db: D1Database,
  id: string,
  content: { subject: string; textBody: string; htmlBody: string },
  scheduledAt: string,
  now: string
): Promise<boolean> {
  const result = await db.prepare(
    `UPDATE notifications
     SET subject = ?, text_body = ?, html_body = ?, scheduled_at = ?, next_attempt_at = ?, updated_at = ?
     WHERE id = ? AND status = 'PENDING'`
  ).bind(content.subject, content.textBody, content.htmlBody, scheduledAt, scheduledAt, now, id).run();
  return Boolean(result.meta.changes);
}

export async function findNotificationByIdempotencyKey(db: D1Database, key: string): Promise<Notification | null> {
  return db.prepare(
    "SELECT n.*, u.email AS recipient_email FROM notifications n JOIN users u ON u.id = n.recipient_user_id WHERE n.idempotency_key = ?"
  ).bind(key).first<Notification>();
}

export async function insertNotification(db: D1Database, input: NotificationInsert): Promise<Notification> {
  await db.prepare(
    `INSERT INTO notifications
      (id, event_type, event_id, recipient_user_id, student_id, lesson_id, resource_id, report_id,
       status, idempotency_key, subject, text_body, html_body, attempt_count, created_at, updated_at,
       scheduled_at, next_attempt_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
     ON CONFLICT(idempotency_key) DO NOTHING`
  ).bind(
    input.id,
    input.eventType,
    input.eventId,
    input.recipientUserId,
    input.studentId ?? null,
    input.lessonId ?? null,
    input.resourceId ?? null,
    input.reportId ?? null,
    input.status ?? "PENDING",
    input.idempotencyKey,
    input.subject,
    input.textBody,
    input.htmlBody,
    input.createdAt,
    input.createdAt,
    input.scheduledAt ?? null,
    input.nextAttemptAt ?? null
  ).run();
  const row = await findNotificationByIdempotencyKey(db, input.idempotencyKey);
  if (!row) throw new Error("Notification record was not created");
  return row;
}

export async function claimNotification(db: D1Database, id: string, now: string, staleBefore: string): Promise<Notification | null> {
  await db.prepare(
    `UPDATE notifications
     SET status = 'UNKNOWN', error_category = 'PROVIDER_UNKNOWN', error_message = 'Previous delivery claim expired', updated_at = ?, next_attempt_at = ?
     WHERE status = 'SENDING' AND last_attempted_at < ?`
  ).bind(now, now, staleBefore).run();
  const result = await db.prepare(
    `UPDATE notifications
     SET status = 'SENDING', attempt_count = attempt_count + 1, last_attempted_at = ?, updated_at = ?
     WHERE id = ? AND (
       (status = 'PENDING' AND (scheduled_at IS NULL OR scheduled_at <= ?))
       OR (status = 'FAILED' AND next_attempt_at IS NOT NULL AND next_attempt_at <= ?)
       OR (status = 'UNKNOWN' AND next_attempt_at IS NOT NULL AND next_attempt_at <= ?)
     )`
  ).bind(now, now, id, now, now, now).run();
  if (!result.meta.changes) return null;
  return findNotificationById(db, id);
}

export async function markNotificationSent(db: D1Database, id: string, providerReference: string | null, now: string): Promise<void> {
  await db.prepare("UPDATE notifications SET status = 'SENT', provider_reference = ?, sent_at = ?, updated_at = ?, error_category = NULL, error_message = NULL WHERE id = ?").bind(providerReference, now, now, id).run();
}

export async function markNotificationOutcome(
  db: D1Database,
  id: string,
  status: "UNKNOWN" | "FAILED",
  category: string,
  message: string,
  nextAttemptAt: string | null,
  now: string
): Promise<void> {
  await db.prepare("UPDATE notifications SET status = ?, error_category = ?, error_message = ?, next_attempt_at = ?, updated_at = ? WHERE id = ?").bind(status, category, message.slice(0, 200), nextAttemptAt, now, id).run();
}

export async function resetNotificationForRetry(db: D1Database, id: string, now: string): Promise<void> {
  await db.prepare(
    "UPDATE notifications SET status = 'PENDING', next_attempt_at = ?, updated_at = ? WHERE id = ? AND status IN ('FAILED', 'UNKNOWN')"
  ).bind(now, now, id).run();
}

export async function suppressPendingNotification(db: D1Database, id: string, now: string): Promise<void> {
  await db.prepare(
    "UPDATE notifications SET status = 'SUPPRESSED', updated_at = ?, next_attempt_at = NULL WHERE id = ? AND status = 'PENDING'"
  ).bind(now, id).run();
}

export async function listNotifications(db: D1Database, status?: NotificationStatus, limit = 50, offset = 0): Promise<Notification[]> {
  const clause = status ? "WHERE n.status = ?" : "";
  const bindings: (string | number)[] = status ? [status, limit, offset] : [limit, offset];
  const result = await db.prepare(
    `SELECT n.*, u.email AS recipient_email, s.name AS student_name, l.start_at AS lesson_start_at
     FROM notifications n
     JOIN users u ON u.id = n.recipient_user_id
     LEFT JOIN students s ON s.id = n.student_id
     LEFT JOIN lessons l ON l.id = n.lesson_id
     ${clause}
     ORDER BY n.created_at DESC, n.id DESC LIMIT ? OFFSET ?`
  ).bind(...bindings).all<Notification>();
  return result.results;
}

export async function countNotifications(db: D1Database, status?: NotificationStatus): Promise<number> {
  const result = status
    ? await db.prepare("SELECT COUNT(*) AS count FROM notifications WHERE status = ?").bind(status).first<{ count: number | string }>()
    : await db.prepare("SELECT COUNT(*) AS count FROM notifications").first<{ count: number | string }>();
  return Number(result?.count ?? 0);
}

export async function notificationCounts(db: D1Database): Promise<Record<NotificationStatus, number>> {
  const result = await db.prepare("SELECT status, COUNT(*) AS count FROM notifications GROUP BY status").all<{ status: NotificationStatus; count: number | string }>();
  const counts: Record<NotificationStatus, number> = { PENDING: 0, SENDING: 0, SENT: 0, UNKNOWN: 0, FAILED: 0, SUPPRESSED: 0 };
  for (const row of result.results) counts[row.status] = Number(row.count);
  return counts;
}

export async function listDueReminderLessons(db: D1Database, now: string, limit: number, lookaheadMinutes = 15): Promise<Array<{
  id: string;
  student_id: string;
  student_name: string;
  recipient_user_id: string;
  recipient_email: string;
  start_at: string;
  end_at: string;
  timezone: string;
  external_url: string | null;
}>> {
  const upper = new Date(Date.parse(now) + lookaheadMinutes * 60_000).toISOString();
  const result = await db.prepare(
    `SELECT l.id, l.student_id, s.name AS student_name, u.id AS recipient_user_id, u.email AS recipient_email,
            l.start_at, l.end_at, l.timezone, l.external_url
     FROM lessons l
     JOIN students s ON s.id = l.student_id AND s.status = 'ACTIVE'
     JOIN users u ON u.id = s.learn_user_id AND u.status = 'ACTIVE' AND u.role = 'STUDENT'
     WHERE l.status = 'scheduled' AND l.start_at > ? AND l.start_at <= ?
     ORDER BY l.start_at ASC, l.id ASC
     LIMIT ?`
  ).bind(now, upper, limit).all<{
    id: string;
    student_id: string;
    student_name: string;
    recipient_user_id: string;
    recipient_email: string;
    start_at: string;
    end_at: string;
    timezone: string;
    external_url: string | null;
  }>();
  return result.results;
}
