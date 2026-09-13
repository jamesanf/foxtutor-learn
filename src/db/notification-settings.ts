import type { NotificationType } from "../domain/notifications";

export interface NotificationSetting {
  event_type: NotificationType;
  enabled: number;
  timing_minutes: number | null;
  subject_prefix: string;
  body_note: string;
  updated_at: string;
  updated_by_user_id: string | null;
}

export async function listNotificationSettings(db: D1Database): Promise<NotificationSetting[]> {
  const result = await db.prepare(
    "SELECT * FROM notification_settings ORDER BY event_type ASC"
  ).all<NotificationSetting>();
  return result.results;
}

export async function findNotificationSetting(db: D1Database, eventType: NotificationType): Promise<NotificationSetting | null> {
  return db.prepare("SELECT * FROM notification_settings WHERE event_type = ?")
    .bind(eventType)
    .first<NotificationSetting>();
}

export async function upsertNotificationSetting(
  db: D1Database,
  input: {
    eventType: NotificationType;
    enabled: boolean;
    timingMinutes: number | null;
    subjectPrefix: string;
    bodyNote: string;
    updatedAt: string;
    updatedByUserId: string;
  }
): Promise<void> {
  await db.prepare(
    `INSERT INTO notification_settings
       (event_type, enabled, timing_minutes, subject_prefix, body_note, updated_at, updated_by_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(event_type) DO UPDATE SET
       enabled = excluded.enabled,
       timing_minutes = excluded.timing_minutes,
       subject_prefix = excluded.subject_prefix,
       body_note = excluded.body_note,
       updated_at = excluded.updated_at,
       updated_by_user_id = excluded.updated_by_user_id`
  ).bind(
    input.eventType,
    input.enabled ? 1 : 0,
    input.timingMinutes,
    input.subjectPrefix,
    input.bodyNote,
    input.updatedAt,
    input.updatedByUserId
  ).run();
}
