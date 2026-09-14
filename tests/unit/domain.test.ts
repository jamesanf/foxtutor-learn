import { describe, expect, it } from "vitest";
import {
  canTransitionLessonStatus,
  deriveLessonEnd,
  isoToLocalDateTime,
  isQuarterHourTime,
  localDateTimeToIso,
  STANDARD_LESSON_DURATION_MINUTES,
  validExternalUrl,
  validateLessonInput
} from "../../src/domain/validation";

describe("lesson domain validation", () => {
  it("stores an unambiguous UTC instant while preserving the selected timezone", () => {
    const result = localDateTimeToIso("2026-10-09T14:00", "Europe/London");
    expect(result.value).toBe("2026-10-09T13:00:00.000Z");
    expect(isoToLocalDateTime(result.value as string, "Europe/London")).toBe("2026-10-09T14:00");
  });

  it("derives the standard 55-minute duration from the stored instant", () => {
    const start = localDateTimeToIso("2026-10-09T14:00", "Europe/London").value as string;
    expect(STANDARD_LESSON_DURATION_MINUTES).toBe(55);
    expect(deriveLessonEnd(start)).toBe("2026-10-09T13:55:00.000Z");
    expect(isoToLocalDateTime(deriveLessonEnd(start) as string, "Europe/London")).toBe("2026-10-09T14:55");
  });

  it("keeps the derived duration timezone-aware across the UK spring transition", () => {
    const start = localDateTimeToIso("2026-03-29T00:30", "Europe/London").value as string;
    const end = deriveLessonEnd(start) as string;
    expect(end).toBe("2026-03-29T01:25:00.000Z");
    expect(isoToLocalDateTime(end, "Europe/London")).toBe("2026-03-29T02:25");
    expect(localDateTimeToIso("2026-03-29T01:00", "Europe/London").error).toContain("does not exist");
  });

  it("limits standard start choices to quarter-hour increments", () => {
    expect(isQuarterHourTime("16:00")).toBe(true);
    expect(isQuarterHourTime("16:15")).toBe(true);
    expect(isQuarterHourTime("16:30")).toBe(true);
    expect(isQuarterHourTime("16:45")).toBe(true);
    expect(isQuarterHourTime("16:10")).toBe(false);
  });

  it("rejects invalid timezones, reversed intervals and unsafe URLs", () => {
    expect(localDateTimeToIso("2026-10-09T14:00", "Not/AZone").error).toContain("Europe/London");
    expect(validateLessonInput({
      studentId: "student-1",
      startAt: "2026-10-09T15:00",
      endAt: "2026-10-09T14:00",
      timezone: "Europe/London",
      status: "scheduled",
      notes: "",
      externalUrl: ""
    }).error).toContain("after");
    expect(validExternalUrl("javascript:alert(1)")).toBeNull();
    expect(validExternalUrl("https://meet.example.test/lesson")).toBe("https://meet.example.test/lesson");
  });

  it("allows only explicit forward lifecycle transitions", () => {
    expect(canTransitionLessonStatus("scheduled", "completed")).toBe(true);
    expect(canTransitionLessonStatus("scheduled", "cancelled")).toBe(true);
    expect(canTransitionLessonStatus("completed", "cancelled")).toBe(false);
  });
});
