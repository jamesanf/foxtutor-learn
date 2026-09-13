import { describe, expect, it } from "vitest";
import {
  eventIdempotencyKey,
  hasMaterialLessonChange,
  isNotificationType,
  reminderDueAt,
  reminderIdempotencyKey
} from "../../src/domain/notifications";
import { learnLink } from "../../src/notifications/links";
import { renderEmail, renderLessonReport, renderStudentInvitation } from "../../src/notifications/templates";

describe("notification domain", () => {
  it("uses finite event types and deterministic business keys", () => {
    expect(isNotificationType("LESSON_REPORT")).toBe(true);
    expect(isNotificationType("ARBITRARY_EMAIL")).toBe(false);
    expect(eventIdempotencyKey("LESSON_CREATED", "lesson-1")).toBe("lesson-created:lesson-1");
    expect(reminderIdempotencyKey("lesson-1")).toBe("lesson-reminder:lesson-1:24h");
  });

  it("calculates the configured reminder interval from the stored UTC instant", () => {
    expect(reminderDueAt("2026-09-14T13:00:00.000Z")).toBe("2026-09-13T13:00:00.000Z");
    expect(reminderDueAt("not-a-date")).toBeNull();
  });

  it("only treats student-visible lesson fields as material", () => {
    const before = { student_id: "student-1", start_at: "2026-09-14T13:00:00.000Z", end_at: "2026-09-14T13:55:00.000Z", timezone: "Europe/London", external_url: null };
    expect(hasMaterialLessonChange(before, before)).toBe(false);
    expect(hasMaterialLessonChange(before, { ...before, end_at: "2026-09-14T14:00:00.000Z" })).toBe(true);
  });

  it("keeps application links under the configured Learn origin", () => {
    expect(learnLink("https://foxtutor.org/learn", "/learn/student/lessons/lesson-1")).toBe("https://foxtutor.org/learn/student/lessons/lesson-1");
  });

  it("escapes report content and does not include private lesson notes", () => {
    const rendered = renderLessonReport({
      studentName: "A <Student>",
      startAt: "2026-09-14T13:00:00.000Z",
      endAt: "2026-09-14T13:55:00.000Z",
      timezone: "Europe/London",
      lessonPath: "/learn/student/lessons/lesson-1",
      reportPath: "/learn/student/lessons/lesson-1/report",
      externalUrl: null,
      pupilName: "A <Student>",
      level: "ESOL N5/H",
      thisLessonsFocus: "<script>alert(1)</script>",
      nextLessonsFocus: "Read & practise",
      writingPractice: "",
      homeLearningTask: "",
      notes: "",
      evenBetterIf: "",
      resources: [{ filename: "A <worksheet>.pdf", path: "/learn/student/resources/resource-1/download" }]
    }, "https://foxtutor.org/learn");
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).toContain("&lt;script&gt;");
    expect(rendered.html).toContain("A &lt;worksheet&gt;.pdf");
    for (const label of ["This Lesson's Focus", "Next Lesson's Focus", "Writing Practice", "Home Learning Task", "Notes", "Even Better If"]) {
      expect(rendered.html).toContain(label);
    }
    expect(rendered.html).toContain("/learn/student/lessons/lesson-1/report");
    expect(rendered.html).not.toContain("Summary");
  });

  it("builds a minimal invitation with the Learn entry link", () => {
    const rendered = renderStudentInvitation({ studentName: "Jamie", origin: "https://foxtutor.org/learn" });
    expect(rendered.subject).toBe("Welcome to FoxTutor Learn");
    expect(rendered.text).toContain("https://foxtutor.org/learn");
    expect(rendered.text).not.toContain("/admin");
  });

  it("rejects incomplete untyped template projections", () => {
    expect(() => renderEmail("LESSON_CREATED", { studentName: "Jamie" }, "https://foxtutor.org/learn")).toThrow("startAt");
  });
});
