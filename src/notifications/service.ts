import type { MailEnvironment } from "../mail/client";
import { sendMailDetailed } from "../mail/client";
import { markLessonReportSent } from "../db/reports";
import {
  claimNotification,
  findNotificationByIdempotencyKey,
  insertNotification,
  listDueReminderLessons,
  markNotificationOutcome,
  markNotificationSent,
  resetNotificationForRetry,
  type Notification,
  type NotificationInsert
} from "../db/notifications";
import {
  eventIdempotencyKey,
  MAX_NOTIFICATION_ATTEMPTS,
  reminderDueAt,
  reminderIdempotencyKey,
  type NotificationType
} from "../domain/notifications";
import { renderEmail, type EmailContent } from "./templates";
import { canonicalLearnOrigin } from "./links";
import { dstWarningForInstant } from "../domain/dst";
import { listInternationalStudentRecipients } from "../db/students";
import { lessonUrlKey } from "../domain/lesson-url";

export interface NotificationEnvironment extends MailEnvironment {
  PUBLIC_ORIGIN?: string;
}

export interface NotificationDraft {
  type: NotificationType;
  eventId: string;
  recipientUserId: string;
  studentId?: string | null;
  lessonId?: string | null;
  resourceId?: string | null;
  reportId?: string | null;
  content: EmailContent;
  scheduledAt?: string | null;
}

function nextRetryAt(now: string, attemptCount: number): string | null {
  if (attemptCount >= MAX_NOTIFICATION_ATTEMPTS) return null;
  return new Date(Date.parse(now) + Math.min(60, 5 * 2 ** Math.max(0, attemptCount - 1)) * 60_000).toISOString();
}

export async function createNotification(db: D1Database, draft: NotificationDraft, now: string): Promise<Notification> {
  const insert: NotificationInsert = {
    id: crypto.randomUUID(),
    eventType: draft.type,
    eventId: draft.eventId,
    recipientUserId: draft.recipientUserId,
    studentId: draft.studentId,
    lessonId: draft.lessonId,
    resourceId: draft.resourceId,
    reportId: draft.reportId,
    idempotencyKey: eventIdempotencyKey(draft.type, draft.eventId),
    subject: draft.content.subject,
    textBody: draft.content.text,
    htmlBody: draft.content.html,
    createdAt: now,
    scheduledAt: draft.scheduledAt,
    nextAttemptAt: draft.scheduledAt ?? now
  };
  return insertNotification(db, insert);
}

export async function deliverNotification(
  db: D1Database,
  env: NotificationEnvironment,
  notificationId: string,
  now = new Date().toISOString(),
  fetcher: typeof fetch = fetch
): Promise<Notification | null> {
  const staleBefore = new Date(Date.parse(now) - 15 * 60_000).toISOString();
  const claimed = await claimNotification(db, notificationId, now, staleBefore);
  if (!claimed) return null;
  const result = await sendMailDetailed(env, {
    to: claimed.recipient_email ?? "",
    ...(env.MAIL_API_REPLY_TO ? { replyTo: env.MAIL_API_REPLY_TO } : {}),
    subject: claimed.subject,
    text: claimed.text_body,
    html: claimed.html_body,
    idempotencyKey: `notification:${claimed.id}`
  }, fetcher);
  if (result.kind === "accepted") {
    await markNotificationSent(db, claimed.id, result.providerReference, now);
    if (claimed.report_id) await markLessonReportSent(db, claimed.report_id, now);
  } else {
    const status = result.unknown ? "UNKNOWN" : "FAILED";
    const retryAt = result.retryable ? nextRetryAt(now, claimed.attempt_count) : null;
    await markNotificationOutcome(db, claimed.id, status, result.category, result.safeMessage, retryAt, now);
  }
  return { ...claimed, status: result.kind === "accepted" ? "SENT" : (result.unknown ? "UNKNOWN" : "FAILED") };
}

export async function createAndDeliverNotification(
  db: D1Database,
  env: NotificationEnvironment,
  draft: NotificationDraft,
  now = new Date().toISOString(),
  fetcher: typeof fetch = fetch
): Promise<Notification> {
  const notification = await createNotification(db, draft, now);
  if (notification.status === "SENT") return notification;
  if (notification.status === "FAILED" || notification.status === "UNKNOWN") {
    await resetNotificationForRetry(db, notification.id, now);
  }
  await deliverNotification(db, env, notification.id, now, fetcher);
  return (await findNotificationByIdempotencyKey(db, notification.idempotency_key)) ?? notification;
}

export async function runReminderScheduler(
  db: D1Database,
  env: NotificationEnvironment,
  now = new Date().toISOString(),
  fetcher: typeof fetch = fetch
): Promise<number> {
  const dueLessons = await listDueReminderLessons(db, now, 25);
  let processed = 0;
  const origin = canonicalLearnOrigin(env.PUBLIC_ORIGIN);
  for (const lesson of dueLessons) {
    const scheduledAt = reminderDueAt(lesson.start_at);
    if (!scheduledAt || Date.parse(scheduledAt) > Date.parse(now)) continue;
    const key = reminderIdempotencyKey(lesson.id);
    const existing = await findNotificationByIdempotencyKey(db, key);
    if (existing?.status === "SENT") continue;
    const content = renderEmail("LESSON_REMINDER", {
      studentName: lesson.student_name,
      startAt: lesson.start_at,
      endAt: lesson.end_at,
      timezone: lesson.timezone,
      lessonPath: `/learn/student/lessons/${encodeURIComponent(lessonUrlKey(lesson.id))}`,
      externalUrl: lesson.external_url
    }, origin);
    const notification = await insertNotification(db, {
      id: crypto.randomUUID(),
      eventType: "LESSON_REMINDER",
      eventId: `${lesson.id}:24h`,
      recipientUserId: lesson.recipient_user_id,
      studentId: lesson.student_id,
      lessonId: lesson.id,
      idempotencyKey: key,
      subject: content.subject,
      textBody: content.text,
      htmlBody: content.html,
      createdAt: now,
      scheduledAt,
      nextAttemptAt: now
    });
    if (notification.status !== "SENT") {
      await deliverNotification(db, env, notification.id, now, fetcher);
      processed++;
    }

  }
  return processed;
}

export async function runDstWarningScheduler(
  db: D1Database,
  env: NotificationEnvironment,
  now = new Date().toISOString(),
  fetcher: typeof fetch = fetch
): Promise<number> {
  const warning = dstWarningForInstant(now);
  if (!warning) return 0;
  const origin = canonicalLearnOrigin(env.PUBLIC_ORIGIN);
  const recipients = await listInternationalStudentRecipients(db);
  let processed = 0;
  for (const student of recipients) {
    if (!student.learn_user_id) continue;
    const eventId = `${student.id}:${warning.localDate}`;
    const key = eventIdempotencyKey("DST_WARNING", eventId);
    const content = renderEmail("DST_WARNING", {
      studentName: student.name,
      changeDate: warning.localDate,
      direction: warning.direction
    }, origin);
    const notification = await insertNotification(db, {
      id: crypto.randomUUID(),
      eventType: "DST_WARNING",
      eventId,
      recipientUserId: student.learn_user_id,
      studentId: student.id,
      idempotencyKey: key,
      subject: content.subject,
      textBody: content.text,
      htmlBody: content.html,
      createdAt: now,
      scheduledAt: now,
      nextAttemptAt: now
    });
    if (notification.status !== "SENT") {
      await deliverNotification(db, env, notification.id, now, fetcher);
      processed++;
    }
  }
  return processed;
}
