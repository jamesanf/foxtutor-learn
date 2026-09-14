import { describe, expect, it } from "vitest";
import {
  recurringOccurrencesInWindow,
  sixWeekWindow,
  zonedDateTimeToUtc
} from "../../src/domain/recurrence";

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
});
