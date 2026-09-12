import { describe, expect, it } from "vitest";
import {
  CALENDAR_TIMEZONE,
  calendarDateLabel,
  calendarPeriod,
  calendarPeriodLabel,
  lessonCalendarDate,
  nextCalendarWeek,
  previousCalendarWeek
} from "../../src/domain/calendar";
import { listLessonsForUserInRange, listLessonsInRange } from "../../src/db/lessons";

function mockDb(results: unknown[]): D1Database {
  let query = "";
  let bindings: unknown[] = [];
  const statement = {
    bind(...values: unknown[]) {
      bindings = values;
      return statement;
    },
    all: async <T>() => ({ results: results as T[] })
  };
  return {
    prepare(value: string) {
      query = value;
      return statement;
    },
    get query() {
      return query;
    },
    get bindings() {
      return bindings;
    }
  } as unknown as D1Database;
}

describe("calendar period", () => {
  it("selects a Monday-to-Sunday range and UTC boundaries in the calendar timezone", () => {
    const period = calendarPeriod("2026-10-14");
    expect(period.startDate).toBe("2026-10-12");
    expect(period.endDate).toBe("2026-10-19");
    expect(period.dates).toHaveLength(7);
    expect(period.startAt).toBe("2026-10-11T23:00:00.000Z");
    expect(period.endAt).toBe("2026-10-18T23:00:00.000Z");
    expect(calendarPeriodLabel(period)).toContain("12 Oct 2026");
    expect(calendarDateLabel("2026-10-12")).toContain("Monday");
    expect(previousCalendarWeek(period)).toBe("2026-10-05");
    expect(nextCalendarWeek(period)).toBe("2026-10-19");
  });

  it("falls back from malformed dates without changing the authoritative timezone", () => {
    const period = calendarPeriod("not-a-date", "America/New_York");
    expect(period.timezone).toBe("America/New_York");
    expect(period.startAt.endsWith("04:00:00.000Z") || period.startAt.endsWith("05:00:00.000Z")).toBe(true);
    expect(calendarPeriod("2026-02-30").startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("renders a lesson day using the requested calendar timezone", () => {
    expect(lessonCalendarDate("2026-10-12T00:30:00.000Z", "America/New_York")).toBe("2026-10-11");
    expect(lessonCalendarDate("2026-10-12T00:30:00.000Z", CALENDAR_TIMEZONE)).toBe("2026-10-12");
  });
});

describe("calendar lesson queries", () => {
  it("queries the admin range with deterministic overlap boundaries and ordering", async () => {
    const db = mockDb([{ id: "lesson-a" }]);
    await expect(listLessonsInRange(db, "2026-10-11T23:00:00.000Z", "2026-10-18T23:00:00.000Z")).resolves.toEqual([{ id: "lesson-a" }]);
    const inspected = db as D1Database & { query: string; bindings: unknown[] };
    expect(inspected.query).toContain("l.start_at < ?");
    expect(inspected.query).toContain("l.end_at > ?");
    expect(inspected.query).toContain("ORDER BY l.start_at ASC, l.id ASC");
    expect(inspected.bindings).toEqual(["2026-10-18T23:00:00.000Z", "2026-10-11T23:00:00.000Z"]);
  });

  it("keeps student ownership in the range query and omits private lesson notes", async () => {
    const db = mockDb([]);
    await listLessonsForUserInRange(db, "user-a", "2026-10-11T23:00:00.000Z", "2026-10-18T23:00:00.000Z");
    const inspected = db as D1Database & { query: string; bindings: unknown[] };
    expect(inspected.query).toContain("s.learn_user_id = ?");
    expect(inspected.query).toContain("u.role = 'STUDENT'");
    expect(inspected.query).not.toContain("l.notes");
    expect(inspected.bindings).toEqual(["user-a", "2026-10-18T23:00:00.000Z", "2026-10-11T23:00:00.000Z"]);
  });
});
