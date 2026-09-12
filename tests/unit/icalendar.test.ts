import { describe, expect, it } from "vitest";
import { escapeIcsText, feedRange, generateIcs } from "../../src/domain/icalendar";
import type { Lesson } from "../../src/db/lessons";

const lesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  id: "lesson-1",
  student_id: "student-1",
  student_name: "Alice, Smith; senior\\mentor",
  start_at: "2026-10-25T09:00:00.000Z",
  end_at: "2026-10-25T10:00:00.000Z",
  timezone: "Europe/London",
  status: "scheduled",
  notes: "private notes must not be exported",
  external_url: "https://example.com/lesson/1",
  created_at: "2026-09-12T10:00:00.000Z",
  updated_at: "2026-09-12T11:00:00.000Z",
  ...overrides
});

describe("iCalendar projection", () => {
  it("emits CRLF, stable UID, UTC instants, status and approved URL", () => {
    const output = generateIcs([lesson()], "ADMIN");
    expect(output.endsWith("\r\n")).toBe(true);
    expect(output).toContain("BEGIN:VCALENDAR\r\n");
    expect(output).toContain("UID:lesson-1@foxtutor.org\r\n");
    expect(output).toContain("DTSTAMP:20260912T110000Z\r\n");
    expect(output).toContain("DTSTART:20261025T090000Z\r\n");
    expect(output).toContain("STATUS:CONFIRMED\r\n");
    expect(output).toContain("SUMMARY:Lesson - Alice\\, Smith\\; senior\\\\mentor\r\n");
    expect(output).toContain("URL:https://example.com/lesson/1\r\n");
    expect(output).not.toContain("private notes");
  });

  it("keeps cancelled events under the same UID", () => {
    const output = generateIcs([lesson({ status: "cancelled", updated_at: "2026-09-13T11:00:00.000Z" })], "STUDENT");
    expect(output).toContain("UID:lesson-1@foxtutor.org\r\n");
    expect(output).toContain("STATUS:CANCELLED\r\n");
    expect(output).toContain("LAST-MODIFIED:20260913T110000Z\r\n");
  });

  it("escapes text and folds long UTF-8 properties without breaking CRLF structure", () => {
    expect(escapeIcsText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
    const output = generateIcs([lesson({ student_name: "A".repeat(180) })], "ADMIN");
    const lines = output.split("\r\n").filter(Boolean);
    expect(lines.some((line) => line.startsWith(" "))).toBe(true);
    expect(lines.every((line) => new TextEncoder().encode(line).byteLength <= 75)).toBe(true);
    expect(output).not.toContain("\n\n");
  });

  it("uses a bounded recent-past and future range", () => {
    const range = feedRange(new Date("2026-09-12T00:00:00.000Z"));
    expect(range.startAt).toBe("2026-06-14T00:00:00.000Z");
    expect(range.endAt).toBe("2027-09-12T00:00:00.000Z");
  });
});
