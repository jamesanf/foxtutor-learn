export const NOTIFICATION_TYPES = [
  "STUDENT_INVITED",
  "LESSON_CREATED",
  "LESSON_CHANGED",
  "LESSON_REMINDER",
  "RESOURCE_ADDED",
  "CANCELLATION_PROCESSED",
  "CANCELLATION_REQUESTED",
  "CANCELLATION_APPROVED",
  "CANCELLATION_REJECTED",
  "LESSON_RESCHEDULED",
  "LESSON_REPORT",
  "DST_WARNING"
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationStatus = "PENDING" | "SENDING" | "SENT" | "UNKNOWN" | "FAILED";

export const REMINDER_INTERVAL_MINUTES = 24 * 60;
export const REMINDER_LOOKAHEAD_MINUTES = REMINDER_INTERVAL_MINUTES;
export const REMINDER_BATCH_SIZE = 25;
export const MAX_NOTIFICATION_ATTEMPTS = 3;

export function isNotificationType(value: string): value is NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(value);
}

export function reminderDueAt(startAt: string, intervalMinutes = REMINDER_INTERVAL_MINUTES): string | null {
  const start = Date.parse(startAt);
  if (!Number.isFinite(start) || !Number.isInteger(intervalMinutes) || intervalMinutes <= 0) return null;
  return new Date(start - intervalMinutes * 60_000).toISOString();
}

export function reminderIdempotencyKey(lessonId: string, startAt?: string): string {
  return startAt
    ? `lesson-reminder:${lessonId}:${startAt}:24h`
    : `lesson-reminder:${lessonId}:24h`;
}

export function eventIdempotencyKey(type: NotificationType, eventId: string): string {
  return `${type.toLowerCase().replaceAll("_", "-")}:${eventId}`;
}

export interface LessonChangeSnapshot {
  student_id: string;
  start_at: string;
  end_at: string;
  timezone: string;
  external_url: string | null;
}

export function hasMaterialLessonChange(before: LessonChangeSnapshot, after: LessonChangeSnapshot): boolean {
  return before.student_id !== after.student_id
    || before.start_at !== after.start_at
    || before.end_at !== after.end_at
    || before.timezone !== after.timezone
    || before.external_url !== after.external_url;
}

export function retryableNotificationCategory(category: string | null): boolean {
  return category === "PROVIDER_RATE_LIMIT" || category === "PROVIDER_UNAVAILABLE" || category === "PROVIDER_TIMEOUT";
}

export function safeNotificationErrorCategory(status: number): string {
  if (status === 401 || status === 403) return "PROVIDER_AUTH";
  if (status === 408 || status === 504) return "PROVIDER_TIMEOUT";
  if (status === 409 || status === 422) return "PROVIDER_VALIDATION";
  if (status === 429) return "PROVIDER_RATE_LIMIT";
  if (status >= 500) return "PROVIDER_UNAVAILABLE";
  if (status >= 400) return "PROVIDER_VALIDATION";
  return "INTERNAL";
}
