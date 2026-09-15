import { describe, expect, it } from "vitest";
import {
  recurringOccurrencesInWindow,
  sixWeekWindow,
  zonedDateTimeToUtc
} from "../../src/domain/recurrence";
import { cancelRecurringLesson, ensureRecurringSeriesMaterialised, findRecurringSeriesConflict } from "../../src/db/recurrence";

describe("recurring lesson materialisation", () => {
  it("maintains a six-week inclusive rolling window without generating an infinite series", () => {
    const occurrences = recurringOccurrencesInWindow({
      dayOfWeek: 2,
      localStartTime: "16:00",
      durationMinutes: 55,
      timezone: "Europe/London",
      startDate: "2026-09-01"
    }, "2026-09-14", sixWeekWindow("2026-09-14").endDate);
    expect(occurrences).toHaveLength(6);
    expect(occurrences[0]?.recurrenceKey).toBe("2026-09-15");
    expect(occurrences.at(-1)?.recurrenceKey).toBe("2026-10-20");
  });

  it("does not generate before the series start or after its end date", () => {
    const occurrences = recurringOccurrencesInWindow({
      dayOfWeek: 1,
      localStartTime: "09:00",
      durationMinutes: 60,
      timezone: "Europe/London",
      startDate: "2026-09-21",
      endDate: "2026-10-05"
    }, "2026-09-01", "2026-12-31");
    expect(occurrences.map((item) => item.recurrenceKey)).toEqual(["2026-09-21", "2026-09-28", "2026-10-05"]);
  });

  it("suppresses paused dates and resumes after the pause", () => {
    const occurrences = recurringOccurrencesInWindow({
      dayOfWeek: 2,
      localStartTime: "16:00",
      durationMinutes: 55,
      timezone: "Europe/London",
      startDate: "2026-06-01"
    }, "2026-06-02", "2026-09-01", [{ startsOn: "2026-07-01", endsOn: "2026-08-20" }]);
    expect(occurrences.some((item) => item.recurrenceKey === "2026-07-07")).toBe(false);
    expect(occurrences.some((item) => item.recurrenceKey === "2026-08-25")).toBe(true);
  });

  it("resolves local times through the London daylight-saving transition", () => {
    expect(zonedDateTimeToUtc("2026-03-24", "16:00", "Europe/London")).toBe("2026-03-24T16:00:00.000Z");
    expect(zonedDateTimeToUtc("2026-03-31", "16:00", "Europe/London")).toBe("2026-03-31T15:00:00.000Z");
    expect(zonedDateTimeToUtc("2026-10-20", "16:00", "Europe/London")).toBe("2026-10-20T15:00:00.000Z");
  });

  it("rejects arbitrary series timezones", () => {
    expect(() => recurringOccurrencesInWindow({
      dayOfWeek: 2,
      localStartTime: "16:00",
      durationMinutes: 55,
      timezone: "America/New_York",
      startDate: "2026-09-01"
    }, "2026-09-01", "2026-10-01")).toThrow("Europe/London");
  });

  it("finds the first pre-existing lesson in the six-week materialisation window", async () => {
    const conflict = {
      id: "lesson-existing",
      student_id: "student-existing",
      student_name: "Another Student",
      start_at: "2026-09-14T10:00:00.000Z",
      end_at: "2026-09-14T10:55:00.000Z",
      timezone: "Europe/London",
      status: "scheduled" as const,
      recurring_series_id: null
    };
    const db = {
      prepare(sql: string) {
        return {
          bind(..._values: unknown[]) {
            return {
              async first<T>() {
                if (sql.includes("SELECT id FROM lessons WHERE recurring_series_id")) return null;
                return conflict as T;
              }
            };
          }
        };
      }
    } as unknown as D1Database;

    await expect(findRecurringSeriesConflict(db, {
      dayOfWeek: 1,
      localStartTime: "10:00",
      durationMinutes: 55,
      startDate: "2026-09-14"
    }, "2026-09-14")).resolves.toEqual(conflict);
  });

  it("materialises a recurring lesson against the partial unique index", async () => {
    const preparedSql: string[] = [];
    const db = {
      prepare(sql: string) {
        preparedSql.push(sql);
        return {
          bind(..._values: unknown[]) {
            return {
              async all() {
                return { results: [] };
              },
              async first() {
                return null;
              },
              async run() {
                return { meta: { changes: 1 } };
              }
            };
          }
        };
      }
    } as unknown as D1Database;

    const result = await ensureRecurringSeriesMaterialised(db, {
      id: "series-1",
      student_id: "student-1",
      payer_student_id: "student-1",
      tutor_user_id: null,
      day_of_week: 5,
      local_start_time: "10:00",
      duration_minutes: 55,
      timezone: "Europe/London",
      recurrence_rule: "WEEKLY",
      start_date: "2026-09-14",
      end_date: null,
      price_minor: 5500,
      currency: "GBP",
      status: "ACTIVE",
      revision: 1,
      created_at: "2026-09-14T12:00:00.000Z",
      updated_at: "2026-09-14T12:00:00.000Z"
    }, "2026-09-14", "2026-09-14T12:00:00.000Z");

    expect(result.createdLessons).toBe(6);
    expect(result.createdBillingEvents).toBe(6);
    expect(preparedSql.some((sql) => sql.includes("ON CONFLICT(recurring_series_id, recurrence_key)") && sql.includes("WHERE recurring_series_id IS NOT NULL"))).toBe(true);
  });

  it("cancels the selected occurrence and every later materialised occurrence from a midpoint", async () => {
    const target = {
      id: "lesson-series-2026-09-29",
      student_id: "student-1",
      recurring_series_id: "series-1",
      recurrence_key: "2026-09-29",
      start_at: "2026-09-29T08:00:00.000Z",
      end_at: "2026-09-29T08:55:00.000Z",
      timezone: "Europe/London",
      payer_student_id: "student-1",
      billing_event_id: "billing-1",
      gross_amount_minor: 5500,
      billing_event_status: "PENDING",
      invoice_id: null,
      invoice_status: null,
      provider_status: null,
      net_amount_minor: 5500,
      credit_applied_minor: 0,
      freeagent_url: null,
      collection_started: 0,
      credit_eligible: 0
    };
    const future = {
      ...target,
      id: "lesson-series-2026-10-06",
      recurrence_key: "2026-10-06",
      start_at: "2026-10-06T08:00:00.000Z",
      end_at: "2026-10-06T08:55:00.000Z",
      billing_event_id: "billing-2"
    };
    const batches: { sql: string; values: unknown[] }[][] = [];
    const db = {
      prepare(sql: string) {
        return {
          bind(...values: unknown[]) {
            const statement = {
              sql,
              values,
              async first<T>() {
                return sql.includes("WHERE l.id = ? AND l.status = 'scheduled'") ? target as T : null;
              },
              async all<T>() {
                return sql.includes("WHERE l.recurring_series_id = ?") ? { results: [target, future] as T[] } : { results: [] as T[] };
              }
            };
            return statement;
          }
        };
      },
      async batch(statements: { sql: string; values: unknown[] }[]) {
        batches.push(statements);
        return statements.map(() => ({ meta: { changes: 1 } }));
      }
    } as unknown as D1Database;

    await expect(cancelRecurringLesson(db, {
      lessonId: target.id,
      actorUserId: "admin-1",
      actorRole: "ADMIN",
      mode: "THIS_AND_FUTURE",
      reason: "Mid-series cancellation",
      now: "2026-09-15T20:00:00.000Z"
    })).resolves.toBe(true);

    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(8);
    expect(batches[0]?.filter((statement) => statement.sql.includes("UPDATE lessons SET status = 'cancelled'"))).toHaveLength(2);
    expect(batches[0]?.some((statement) => statement.sql.includes("SET end_date = ?") && statement.values.includes("2026-09-29"))).toBe(true);
  });

  it("does not queue FreeAgent cancellation once recurring collection has started", async () => {
    const target = {
      id: "lesson-paid",
      student_id: "student-1",
      recurring_series_id: "series-1",
      recurrence_key: "2026-09-29",
      start_at: "2026-09-29T08:00:00.000Z",
      end_at: "2026-09-29T08:55:00.000Z",
      timezone: "Europe/London",
      payer_student_id: "student-1",
      billing_event_id: "billing-paid",
      gross_amount_minor: 5500,
      billing_event_status: "PENDING",
      invoice_id: "invoice-paid",
      invoice_status: "SENT",
      provider_status: "SENT",
      net_amount_minor: 5500,
      credit_applied_minor: 0,
      freeagent_url: "https://freeagent.example/invoices/1",
      collection_started: 1,
      credit_eligible: 1
    };
    const batches: { sql: string; values: unknown[] }[][] = [];
    const db = {
      prepare(sql: string) {
        return {
          bind(..._values: unknown[]) {
            return {
              sql,
              values: _values,
              async first<T>() {
                return target as T;
              }
            };
          }
        };
      },
      async batch(statements: { sql: string; values: unknown[] }[]) {
        batches.push(statements);
        return statements.map(() => ({ meta: { changes: 1 } }));
      }
    } as unknown as D1Database;

    await cancelRecurringLesson(db, {
      lessonId: target.id,
      actorUserId: "admin-1",
      actorRole: "ADMIN",
      mode: "INSTANCE_ONLY",
      reason: "Payment already in progress",
      now: "2026-09-15T20:00:00.000Z"
    });

    expect(batches[0]?.some((statement) => statement.sql.includes("'CANCEL_INVOICE'"))).toBe(false);
    expect(batches[0]?.some((statement) => statement.sql.includes("provider_status = 'CANCELLATION_PENDING'"))).toBe(false);
  });
});
