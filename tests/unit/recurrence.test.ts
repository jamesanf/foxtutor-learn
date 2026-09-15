import { describe, expect, it } from "vitest";
import {
  recurringOccurrencesInWindow,
  sixWeekWindow,
  zonedDateTimeToUtc
} from "../../src/domain/recurrence";
import { ensureRecurringSeriesMaterialised, findRecurringSeriesConflict } from "../../src/db/recurrence";

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
});
