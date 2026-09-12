import { describe, expect, it } from "vitest";
import {
  canTransitionLessonStatus,
  isoToLocalDateTime,
  localDateTimeToIso,
  validExternalUrl,
  validateLessonInput
} from "../../src/domain/validation";

describe("lesson domain validation", () => {
  it("stores an unambiguous UTC instant while preserving the selected timezone", () => {
    const result = localDateTimeToIso("2026-10-09T14:00", "Europe/London");
    expect(result.value).toBe("2026-10-09T13:00:00.000Z");
    expect(isoToLocalDateTime(result.value as string, "Europe/London")).toBe("2026-10-09T14:00");
  });

  it("rejects invalid timezones, reversed intervals and unsafe URLs", () => {
    expect(localDateTimeToIso("2026-10-09T14:00", "Not/AZone").error).toContain("valid IANA timezone");
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
