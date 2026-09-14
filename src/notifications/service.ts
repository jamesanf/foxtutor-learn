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
  suppressPendingNotification,
  updatePendingNotificationContent,
  type Notification,
  type NotificationInsert
} from "../db/notifications";
import { findNotificationSetting } from "../db/notification-settings";
import {
  eventIdempotencyKey,
  MAX_NOTIFICATION_ATTEMPTS,
  reminderDueAt,
  reminderIdempotencyKey,
  REMINDER_INTERVAL_MINUTES,
  REMINDER_LOOKAHEAD_MINUTES,
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

export async function createDirectDebitNotification(
  db: D1Database,
  env: NotificationEnvironment,
  input: { type: "BILLING_DIRECT_DEBIT_SETUP" | "BILLING_DIRECT_DEBIT_REMINDER"; eventId: string; recipientUserId: string; studentId: string; studentName: string },
  now: string,
  fetcher: typeof fetch = fetch
): Promise<Notification> {
  return createAndDeliverNotification(db, env, {
    type: input.type,
    eventId: input.eventId,
    recipientUserId: input.recipientUserId,
    studentId: input.studentId,
    content: renderEmail(input.type, { studentName: input.studentName }, canonicalLearnOrigin(env.PUBLIC_ORIGIN))
  }, now, fetcher);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] ?? character
  ));
}

function controlledContent(content: EmailContent, subjectPrefix: string, bodyNote: string): EmailContent {
  if (!subjectPrefix && !bodyNote) return content;
  return {
    subject: `${subjectPrefix}${content.subject}`,
    text: bodyNote ? `${content.text}\n\n${bodyNote}` : content.text,
    html: bodyNote
      ? `${content.html}<p>${escapeHtml(bodyNote).replace(/\n/g, "<br>")}</p>`
      : content.html
  };
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
    fromName: "FoxTutor",
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
  const setting = await findNotificationSetting(db, draft.type);
  const content = controlledContent(draft.content, setting?.subject_prefix ?? "", setting?.body_note ?? "");
  const scheduledAt = draft.scheduledAt ?? (
    setting?.timing_minutes !== null && setting?.timing_minutes !== undefined && setting.timing_minutes !== 0
      ? new Date(Date.parse(now) + setting.timing_minutes * 60_000).toISOString()
      : null
  );
  const notification = await createNotification(db, { ...draft, content, scheduledAt }, now);
  if (setting && setting.enabled === 0) {
    await db.prepare(
      "UPDATE notifications SET status = 'SUPPRESSED', next_attempt_at = NULL WHERE id = ? AND status = 'PENDING'"
    ).bind(notification.id).run();
    return (await findNotificationByIdempotencyKey(db, notification.idempotency_key)) ?? notification;
  }
  if (scheduledAt && Date.parse(scheduledAt) > Date.parse(now)) return notification;
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
  const dueLessons = await listDueReminderLessons(db, now, 25, REMINDER_LOOKAHEAD_MINUTES);
  let processed = 0;
  const origin = canonicalLearnOrigin(env.PUBLIC_ORIGIN);
  const setting = await findNotificationSetting(db, "LESSON_REMINDER");
  const reminderMinutes = setting?.timing_minutes && setting.timing_minutes > 0 ? setting.timing_minutes : REMINDER_INTERVAL_MINUTES;
  for (const lesson of dueLessons) {
    const scheduledAt = reminderDueAt(lesson.start_at, reminderMinutes);
    if (!scheduledAt) continue;
    const key = reminderIdempotencyKey(lesson.id, lesson.start_at);
    const existing = await findNotificationByIdempotencyKey(db, key)
      ?? await findNotificationByIdempotencyKey(db, reminderIdempotencyKey(lesson.id));
    if (existing?.status === "SENT" || existing?.status === "SUPPRESSED") continue;
    if (setting && setting.enabled === 0 && existing) {
      await suppressPendingNotification(db, existing.id, now);
      continue;
    }
    const rawContent = renderEmail("LESSON_REMINDER", {
      studentName: lesson.student_name,
      startAt: lesson.start_at,
      endAt: lesson.end_at,
      timezone: lesson.timezone,
      lessonPath: `/learn/student/lessons/${encodeURIComponent(lessonUrlKey(lesson.id))}`,
      externalUrl: lesson.external_url,
      reminderLeadMinutes: reminderMinutes
    }, origin);
    const content = controlledContent(rawContent, setting?.subject_prefix ?? "", setting?.body_note ?? "");
    if (existing?.status === "PENDING") {
      await updatePendingNotificationContent(db, existing.id, {
        subject: content.subject,
        textBody: content.text,
        htmlBody: content.html
      }, scheduledAt, now);
    }
    const notification = await insertNotification(db, {
      id: crypto.randomUUID(),
      eventType: "LESSON_REMINDER",
      eventId: `${lesson.id}:15m`,
      recipientUserId: lesson.recipient_user_id,
      studentId: lesson.student_id,
      lessonId: lesson.id,
      idempotencyKey: key,
      subject: content.subject,
      textBody: content.text,
      htmlBody: content.html,
      createdAt: now,
      scheduledAt,
      nextAttemptAt: scheduledAt,
      status: setting?.enabled === 0 ? "SUPPRESSED" : undefined
    });
    if (notification.status === "PENDING" && Date.parse(scheduledAt) <= Date.parse(now)) {
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
  const setting = await findNotificationSetting(db, "DST_WARNING");
  let processed = 0;
  for (const student of recipients) {
    if (!student.learn_user_id) continue;
    const eventId = `${student.id}:${warning.localDate}`;
    const key = eventIdempotencyKey("DST_WARNING", eventId);
    const rawContent = renderEmail("DST_WARNING", {
      studentName: student.name,
      changeDate: warning.localDate,
      direction: warning.direction
    }, origin);
    const content = controlledContent(rawContent, setting?.subject_prefix ?? "", setting?.body_note ?? "");
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
      nextAttemptAt: now,
      status: setting?.enabled === 0 ? "SUPPRESSED" : undefined
    });
    if (notification.status === "PENDING") {
      await deliverNotification(db, env, notification.id, now, fetcher);
      processed++;
    }
  }
  return processed;
}
