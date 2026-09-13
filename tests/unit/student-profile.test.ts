import { describe, expect, it } from "vitest";
import { currentAcademicYear, validateAcademicYear } from "../../src/domain/student-profile";

describe("student academic profile", () => {
  it("validates English and Scottish year streams", () => {
    expect(validateAcademicYear("ENGLISH", "Y11")).toBe("Y11");
    expect(validateAcademicYear("ENGLISH", "S1")).toBeNull();
    expect(validateAcademicYear("SCOTTISH", "P7")).toBe("P7");
    expect(validateAcademicYear("SCOTTISH", "Y7")).toBeNull();
  });

  it("advances dynamic streams after the 15 August boundary", () => {
    expect(currentAcademicYear("ENGLISH", "Y7", "2025-09-01", "2026-09-13T19:00:00.000Z").value).toBe("Y8");
    expect(currentAcademicYear("SCOTTISH", "P7", "2025-09-01", "2026-09-13T19:00:00.000Z").value).toBe("S1");
    expect(currentAcademicYear("ENGLISH", "Y7", "2026-08-01", "2026-08-14T12:00:00.000Z").value).toBe("Y7");
  });

  it("keeps mature, private and international academic categories static", () => {
    expect(currentAcademicYear("MATURE", "Mature", "2020-01-01", "2026-09-13T19:00:00.000Z").value).toBe("Mature");
    expect(currentAcademicYear("PRIVATE", "Private", null, "2026-09-13T19:00:00.000Z").value).toBe("Private");
    expect(currentAcademicYear("INTERNATIONAL", "International", null, "2026-09-13T19:00:00.000Z").value).toBe("International");
  });
});
