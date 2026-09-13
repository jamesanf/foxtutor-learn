import { describe, expect, it } from "vitest";
import {
  eventIdempotencyKey,
  hasMaterialLessonChange,
  isNotificationType,
  reminderDueAt,
  reminderIdempotencyKey
} from "../../src/domain/notifications";
import { learnLink } from "../../src/notifications/links";
import { renderDstWarning, renderEmail, renderLessonReport, renderStudentInvitation } from "../../src/notifications/templates";
import { findNotificationById } from "../../src/db/notifications";

function mockNotificationDb(firstResult: unknown): D1Database {
  let query = "";
  const statement = {
    bind() {
      return statement;
    },
    first() {
      return Promise.resolve(firstResult);
    }
  };
  return {
    prepare(sql: string) {
      query = sql;
      return statement;
    },
    get query() {
      return query;
    }
  } as unknown as D1Database;
}

describe("notification domain", () => {
  it("reloads claimed notifications with the linked recipient email", async () => {
    const db = mockNotificationDb({ id: "notification-1", recipient_email: "student@example.com" });
    await expect(findNotificationById(db, "notification-1")).resolves.toMatchObject({ recipient_email: "student@example.com" });
    expect((db as D1Database & { query: string }).query).toContain("u.email AS recipient_email");
    expect((db as D1Database & { query: string }).query).toContain("JOIN users u ON u.id = n.recipient_user_id");
  });

  it("uses finite event types and deterministic business keys", () => {
    expect(isNotificationType("LESSON_REPORT")).toBe(true);
    expect(isNotificationType("DST_WARNING")).toBe(true);
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
      thisLessonsFocus: "**Speaking** ==practice== <script>alert(1)</script>\n- Ask a question",
      nextLessonsFocus: "Read & practise",
      homeLearningTask: "Complete the worksheet.",
      notes: "Good progress.",
      evenBetterIf: "Use more precise vocabulary.",
      resources: [{ filename: "A <worksheet>.pdf", path: "/learn/student/resources/resource-1/download" }]
    }, "https://foxtutor.org/learn");
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).toContain("&lt;script&gt;");
    expect(rendered.html).toContain("A &lt;worksheet&gt;.pdf");
    for (const label of ["This Lesson&#39;s Focus", "Next Lesson&#39;s Focus", "Home Learning Task", "Notes", "Even Better If"]) {
      expect(rendered.html).toContain(label);
    }
    expect(rendered.html).toContain("<strong>Speaking</strong>");
    expect(rendered.html).toContain('<mark style="background:#fef08a;padding:1px 3px">practice</mark>');
    expect(rendered.html).toContain("<li>Ask a question</li>");
    expect(rendered.html).not.toContain("Writing Practice");
    expect(rendered.html).toContain("/learn/student/lessons/lesson-1/report");
    expect(rendered.html).not.toContain("Summary");
    expect(rendered.html).not.toContain("<!doctype");
    expect(rendered.html).toContain("background:#0e7490");
    expect(rendered.html).toContain("Tutorial feedback");
    expect(rendered.html).toContain("Open report");
  });

  it("builds a minimal invitation with the Learn entry link", () => {
    const rendered = renderStudentInvitation({ studentName: "Jamie", origin: "https://foxtutor.org/learn" });
    expect(rendered.subject).toBe("Welcome to FoxTutor Learn");
    expect(rendered.text).toContain("https://foxtutor.org/learn");
    expect(rendered.text).not.toContain("/admin");
  });

  it("renders the UK clock-change warning without changing lesson times", () => {
    const rendered = renderDstWarning({ studentName: "Jamie", changeDate: "2026-03-29", direction: "forward" });
    expect(rendered.subject).toContain("UK clocks changed");
    expect(rendered.text).toContain("moved forward");
    expect(rendered.text).toContain("scheduled in UK time");
    expect(rendered.text).toContain("no lesson time has been changed");
  });

  it("rejects incomplete untyped template projections", () => {
    expect(() => renderEmail("LESSON_CREATED", { studentName: "Jamie" }, "https://foxtutor.org/learn")).toThrow("startAt");
  });
});
