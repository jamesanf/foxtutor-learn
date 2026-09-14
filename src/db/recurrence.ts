import { collectionDateSevenDaysBeforeLesson } from "../domain/billing";
import { recurringOccurrencesInWindow, sixWeekWindow, type RecurrencePause } from "../domain/recurrence";
import { FOX_TUTOR_TIMEZONE } from "../domain/calendar";
import { cancellationCreditStatements } from "./billing";

export interface RecurringLessonSeries {
  id: string;
  student_id: string;
  payer_student_id: string;
  tutor_user_id: string | null;
  day_of_week: number;
  local_start_time: string;
  duration_minutes: number;
  timezone: typeof FOX_TUTOR_TIMEZONE;
  recurrence_rule: "WEEKLY";
  start_date: string;
  end_date: string | null;
  price_minor: number | string;
  currency: "GBP";
  status: "ACTIVE" | "PAUSED" | "ENDED" | "CANCELLED";
  revision: number;
  created_at: string;
  updated_at: string;
}

export interface RecurringLessonPause {
  id: string;
  series_id: string;
  starts_on: string;
  ends_on: string;
  reason: string;
  created_by_user_id: string | null;
  created_at: string;
}

export interface MaterialisationResult {
  seriesId: string;
  createdLessons: number;
  updatedLessons: number;
  createdBillingEvents: number;
}

export async function findRecurringSeries(db: D1Database, id: string): Promise<RecurringLessonSeries | null> {
  return db.prepare("SELECT * FROM recurring_lesson_series WHERE id = ?").bind(id).first<RecurringLessonSeries>();
}

export async function listActiveRecurringSeries(db: D1Database): Promise<RecurringLessonSeries[]> {
  const result = await db.prepare(
    "SELECT * FROM recurring_lesson_series WHERE status = 'ACTIVE' ORDER BY start_date ASC, id ASC"
  ).all<RecurringLessonSeries>();
  return result.results;
}

export async function listRecurringSeries(db: D1Database): Promise<RecurringLessonSeries[]> {
  const result = await db.prepare(
    "SELECT * FROM recurring_lesson_series ORDER BY CASE status WHEN 'ACTIVE' THEN 0 WHEN 'PAUSED' THEN 1 ELSE 2 END, start_date ASC, id ASC"
  ).all<RecurringLessonSeries>();
  return result.results;
}

export async function listRecurringPauses(db: D1Database, seriesId: string): Promise<RecurringLessonPause[]> {
  const result = await db.prepare(
    "SELECT * FROM recurring_lesson_pauses WHERE series_id = ? ORDER BY starts_on ASC, id ASC"
  ).bind(seriesId).all<RecurringLessonPause>();
  return result.results;
}

export async function createRecurringSeries(
  db: D1Database,
  input: {
    id: string;
    studentId: string;
    payerStudentId: string;
    tutorUserId?: string | null;
    dayOfWeek: number;
    localStartTime: string;
    durationMinutes: number;
    timezone?: string;
    startDate: string;
    endDate?: string | null;
    priceMinor: bigint;
    now: string;
  }
): Promise<void> {
  if (input.priceMinor <= 0n) throw new Error("Recurring lesson price must be positive.");
  if (input.timezone && input.timezone !== FOX_TUTOR_TIMEZONE) {
    throw new Error(`FoxTutor lessons always use ${FOX_TUTOR_TIMEZONE}.`);
  }
  await db.batch([
    db.prepare(
      `INSERT INTO recurring_lesson_series
       (id, student_id, payer_student_id, tutor_user_id, day_of_week, local_start_time,
        duration_minutes, timezone, recurrence_rule, start_date, end_date, price_minor,
        currency, status, revision, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'WEEKLY', ?, ?, ?, 'GBP', 'ACTIVE', 1, ?, ?)`
    ).bind(
      input.id,
      input.studentId,
      input.payerStudentId,
      input.tutorUserId ?? null,
      input.dayOfWeek,
      input.localStartTime,
      input.durationMinutes,
      FOX_TUTOR_TIMEZONE,
      input.startDate,
      input.endDate ?? null,
      Number(input.priceMinor),
      input.now,
      input.now
    ),
    db.prepare(
      `INSERT INTO recurring_series_history
       (id, series_id, event_type, actor_user_id, details, created_at)
       VALUES (?, ?, 'CREATED', ?, ?, ?)`
    ).bind(`series-history:${input.id}:created`, input.id, input.tutorUserId ?? null, "Recurring lesson series created.", input.now)
  ]);
}

export async function addRecurringPause(
  db: D1Database,
  input: { id: string; seriesId: string; startsOn: string; endsOn: string; reason: string; actorUserId?: string | null; now: string }
): Promise<boolean> {
  const result = await db.batch([
    db.prepare(
      `INSERT INTO recurring_lesson_pauses
       (id, series_id, starts_on, ends_on, reason, created_by_user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(series_id, starts_on, ends_on) DO NOTHING`
    ).bind(input.id, input.seriesId, input.startsOn, input.endsOn, input.reason, input.actorUserId ?? null, input.now),
    db.prepare(
      `INSERT INTO recurring_series_history
       (id, series_id, event_type, actor_user_id, details, created_at)
       SELECT ?, ?, 'PAUSED', ?, ?, ?
       WHERE changes() > 0`
    ).bind(`series-history:${input.id}:paused`, input.seriesId, input.actorUserId ?? null, `${input.startsOn} to ${input.endsOn}: ${input.reason}`, input.now)
  ]);
  return Boolean(result[0]?.meta.changes);
}

export async function setRecurringSeriesStatus(
  db: D1Database,
  input: {
    id: string;
    status: "ACTIVE" | "PAUSED" | "ENDED" | "CANCELLED";
    endDate?: string | null;
    actorUserId: string;
    now: string;
    details: string;
  }
): Promise<boolean> {
  const eventType = input.status === "ACTIVE" ? "RESUMED" : input.status === "PAUSED" ? "PAUSED" : input.status === "ENDED" ? "ENDED" : "CANCELLED";
  const result = await db.batch([
    db.prepare(
      `UPDATE recurring_lesson_series
       SET status = ?, end_date = COALESCE(?, end_date), revision = revision + 1, updated_at = ?
       WHERE id = ? AND status != ?`
    ).bind(input.status, input.endDate ?? null, input.now, input.id, input.status),
    db.prepare(
      `INSERT INTO recurring_series_history
       (id, series_id, event_type, actor_user_id, details, created_at)
       SELECT ?, ?, ?, ?, ?, ?
       WHERE changes() > 0`
    ).bind(`series-history:${input.id}:${eventType}:${input.now}`, input.id, eventType, input.actorUserId, input.details, input.now)
  ]);
  return Boolean(result[0]?.meta.changes);
}

export async function updateRecurringSeries(
  db: D1Database,
  input: {
    id: string;
    dayOfWeek: number;
    localStartTime: string;
    durationMinutes: number;
    timezone?: string;
    endDate?: string | null;
    priceMinor: bigint;
    actorUserId?: string | null;
    now: string;
  }
): Promise<boolean> {
  if (input.priceMinor <= 0n) throw new Error("Recurring lesson price must be positive.");
  if (input.timezone && input.timezone !== FOX_TUTOR_TIMEZONE) {
    throw new Error(`FoxTutor lessons always use ${FOX_TUTOR_TIMEZONE}.`);
  }
  const result = await db.batch([
    db.prepare(
      `UPDATE recurring_lesson_series
       SET day_of_week = ?, local_start_time = ?, duration_minutes = ?, timezone = ?,
           end_date = ?, price_minor = ?, revision = revision + 1, updated_at = ?
       WHERE id = ? AND status = 'ACTIVE'`
    ).bind(input.dayOfWeek, input.localStartTime, input.durationMinutes, FOX_TUTOR_TIMEZONE, input.endDate ?? null, Number(input.priceMinor), input.now, input.id),
    db.prepare(
      `INSERT INTO recurring_series_history
       (id, series_id, event_type, actor_user_id, details, created_at)
       SELECT ?, ?, 'UPDATED', ?, ?, ?
       WHERE changes() > 0`
    ).bind(`series-history:${input.id}:revision:${input.now}`, input.id, input.actorUserId ?? null, "Recurring lesson series updated.", input.now)
  ]);
  return Boolean(result[0]?.meta.changes);
}

export async function ensureRecurringSeriesMaterialised(
  db: D1Database,
  series: RecurringLessonSeries,
  today: string,
  now: string
): Promise<MaterialisationResult> {
  const window = sixWeekWindow(today);
  const pauses = await listRecurringPauses(db, series.id);
  const occurrences = recurringOccurrencesInWindow({
    dayOfWeek: series.day_of_week,
    localStartTime: series.local_start_time,
    durationMinutes: series.duration_minutes,
    timezone: FOX_TUTOR_TIMEZONE,
    startDate: series.start_date,
    endDate: series.end_date
  }, window.startDate, window.endDate, pauses.map((pause) => ({
    startsOn: pause.starts_on,
    endsOn: pause.ends_on
  })) as RecurrencePause[]);
  let createdLessons = 0;
  let updatedLessons = 0;
  let createdBillingEvents = 0;

  for (const occurrence of occurrences) {
    const existing = await db.prepare(
      `SELECT id, start_at, end_at, status, instance_override, series_revision
       FROM lessons WHERE recurring_series_id = ? AND recurrence_key = ?`
    ).bind(series.id, occurrence.recurrenceKey).first<{
      id: string;
      start_at: string;
      end_at: string;
      status: string;
      instance_override: number;
      series_revision: number | null;
    }>();
    const lessonId = existing?.id ?? `lesson:${series.id}:${occurrence.recurrenceKey}`;
    if (!existing) {
      const insert = await db.prepare(
        `INSERT INTO lessons
         (id, student_id, start_at, end_at, timezone, status, notes, external_url,
          created_at, updated_at, recurring_series_id, recurrence_key, series_revision,
          series_instance, instance_override)
         VALUES (?, ?, ?, ?, ?, 'scheduled', '', NULL, ?, ?, ?, ?, ?, 1, 0)
         ON CONFLICT(recurring_series_id, recurrence_key) DO NOTHING`
      ).bind(
        lessonId,
        series.student_id,
        occurrence.startAt,
        occurrence.endAt,
        FOX_TUTOR_TIMEZONE,
        now,
        now,
        series.id,
        occurrence.recurrenceKey,
        series.revision
      ).run();
      createdLessons += insert.meta.changes;
    } else if (
      existing.status === "scheduled" &&
      existing.instance_override === 0 &&
      existing.series_revision !== series.revision &&
      Date.parse(existing.start_at) > Date.parse(now)
    ) {
      const update = await db.prepare(
        `UPDATE lessons
         SET start_at = ?, end_at = ?, timezone = ?, series_revision = ?, updated_at = ?
         WHERE id = ? AND status = 'scheduled' AND instance_override = 0`
      ).bind(occurrence.startAt, occurrence.endAt, FOX_TUTOR_TIMEZONE, series.revision, now, existing.id).run();
      updatedLessons += update.meta.changes;
    }

    const billing = await db.prepare(
      `INSERT INTO billing_events
       (id, idempotency_key, event_type, lesson_id, student_id, payer_student_id,
        source_event_id, lesson_date, billing_date, due_date, collection_date,
        gross_amount_minor, net_amount_minor, currency, status, created_at, updated_at)
       SELECT ?, ?, 'WEEKLY_LESSON', l.id, ?, ?, l.id, ?, ?, NULL, ?, ?, ?, 'GBP', 'PENDING', ?, ?
       FROM lessons l
       WHERE l.id = ? AND l.status = 'scheduled'
       ON CONFLICT(idempotency_key) DO NOTHING`
    ).bind(
      `billing:${lessonId}`,
      `billing:lesson:${lessonId}`,
      series.student_id,
      series.payer_student_id,
      occurrence.recurrenceKey,
      occurrence.recurrenceKey,
      collectionDateSevenDaysBeforeLesson(occurrence.recurrenceKey),
      Number(series.price_minor),
      Number(series.price_minor),
      now,
      now,
      lessonId
    ).run();
    createdBillingEvents += billing.meta.changes;
  }
  return { seriesId: series.id, createdLessons, updatedLessons, createdBillingEvents };
}

export async function ensureAllRecurringSeriesMaterialised(
  db: D1Database,
  today: string,
  now: string
): Promise<MaterialisationResult[]> {
  const series = await listActiveRecurringSeries(db);
  const results: MaterialisationResult[] = [];
  for (const item of series) results.push(await ensureRecurringSeriesMaterialised(db, item, today, now));
  return results;
}

export async function cancelRecurringLesson(
  db: D1Database,
  input: {
    lessonId: string;
    actorUserId: string;
    mode: "INSTANCE_ONLY" | "THIS_AND_FUTURE";
    reason: string;
    now: string;
  }
): Promise<boolean> {
  const target = await db.prepare(
    `SELECT l.id, l.student_id, l.recurring_series_id, l.recurrence_key,
            l.start_at, l.end_at, l.timezone, s.payer_student_id,
            b.id AS billing_event_id, b.gross_amount_minor, b.status AS billing_event_status
     FROM lessons l
     JOIN recurring_lesson_series s ON s.id = l.recurring_series_id
     LEFT JOIN billing_events b ON b.lesson_id = l.id
     WHERE l.id = ? AND l.status = 'scheduled'`
  ).bind(input.lessonId).first<{
    id: string;
    student_id: string;
    recurring_series_id: string;
    recurrence_key: string;
    start_at: string;
    end_at: string;
    timezone: string;
    payer_student_id: string;
    billing_event_id: string | null;
    gross_amount_minor: number | string | null;
    billing_event_status: string | null;
  }>();
  if (!target) return false;
  const targets = input.mode === "THIS_AND_FUTURE"
    ? (await db.prepare(
      `SELECT l.id, l.student_id, l.start_at, l.end_at, l.timezone, l.recurrence_key,
              s.payer_student_id, b.id AS billing_event_id, b.gross_amount_minor,
              b.status AS billing_event_status
       FROM lessons l
       JOIN recurring_lesson_series s ON s.id = l.recurring_series_id
       LEFT JOIN billing_events b ON b.lesson_id = l.id
       WHERE l.recurring_series_id = ? AND l.status = 'scheduled' AND l.start_at >= ?
       ORDER BY l.start_at ASC, l.id ASC`
    ).bind(target.recurring_series_id, target.start_at).all<{
      id: string; student_id: string; start_at: string; end_at: string; timezone: string;
      recurrence_key: string; payer_student_id: string; billing_event_id: string | null; gross_amount_minor: number | string | null;
      billing_event_status: string | null;
    }>()).results
    : [{
      id: target.id,
      student_id: target.student_id,
      start_at: target.start_at,
      end_at: target.end_at,
      timezone: target.timezone,
      recurrence_key: target.recurrence_key,
      payer_student_id: target.payer_student_id,
      billing_event_id: target.billing_event_id,
      gross_amount_minor: target.gross_amount_minor,
      billing_event_status: target.billing_event_status
    }];
  const statements: D1PreparedStatement[] = [];
  for (const item of targets) {
    const historyId = `series-cancellation:${item.id}:${input.mode}`;
    statements.push(
      db.prepare(
        `UPDATE lessons SET status = 'cancelled', updated_at = ?
         WHERE id = ? AND status = 'scheduled'`
      ).bind(input.now, item.id),
      db.prepare(
        `INSERT INTO lesson_history
         (id, lesson_id, student_id, initiated_by_user_id, actor_role, event_type,
          reason, billing_consequence, previous_start_at, previous_end_at,
          previous_timezone, resulting_lesson_status, created_at)
         SELECT ?, ?, ?, ?, 'ADMIN', 'ADMIN_CANCELLED', ?, 'ADMIN_CANCELLED',
                ?, ?, ?, 'cancelled', ?
         WHERE changes() > 0
         ON CONFLICT(id) DO NOTHING`
      ).bind(historyId, item.id, item.student_id, input.actorUserId, input.reason, item.start_at, item.end_at, item.timezone, input.now),
      db.prepare("UPDATE billing_events SET status = 'CANCELLED', updated_at = ? WHERE lesson_id = ? AND status != 'SETTLED'")
        .bind(input.now, item.id)
    );
    if (item.billing_event_id && item.gross_amount_minor) {
      statements.push(...cancellationCreditStatements(db, {
        creditId: `credit:${historyId}`,
        accountId: `credit-account:${item.payer_student_id}`,
        studentId: item.student_id,
        payerStudentId: item.payer_student_id,
        sourceEventId: historyId,
        lessonId: item.id,
        cancellationId: historyId,
        amountMinor: BigInt(item.gross_amount_minor),
        now: input.now,
        createProviderOperation: ["INVOICE_CREATED", "SETTLED", "UNKNOWN", "FAILED"].includes(item.billing_event_status ?? "")
      }));
    }
  }
  if (input.mode === "THIS_AND_FUTURE") {
    statements.push(
      db.prepare(
        `UPDATE recurring_lesson_series
         SET end_date = ?, status = 'ENDED', revision = revision + 1, updated_at = ?
         WHERE id = ? AND status IN ('ACTIVE', 'PAUSED')`
      ).bind(target.recurrence_key, input.now, target.recurring_series_id),
      db.prepare(
        `INSERT INTO recurring_series_history
         (id, series_id, event_type, actor_user_id, details, created_at)
         VALUES (?, ?, 'ENDED', ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`
      ).bind(`series-history:${target.recurring_series_id}:ended:${target.recurrence_key}`, target.recurring_series_id, input.actorUserId, `Ended from ${target.recurrence_key}: ${input.reason}`, input.now)
    );
  }
  await db.batch(statements);
  return true;
}
