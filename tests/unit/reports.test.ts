import { describe, expect, it } from "vitest";
import { generateLessonReportPdf } from "../../src/reports/pdf";
import { reportViewModel } from "../../src/reports/view";
import type { LessonReport } from "../../src/db/reports";

const report: LessonReport = {
  id: "report-1",
  lesson_id: "lesson-1",
  student_id: "student-1",
  created_by_user_id: "admin-1",
  pupil_name: "Brian",
  level: "ESOL N5/H",
  lesson_date: "2026-09-13",
  lesson_start_at: "2026-09-13T12:00:00.000Z",
  lesson_end_at: "2026-09-13T12:55:00.000Z",
  lesson_timezone: "Europe/London",
  this_lessons_focus: "Tourism: speaking and listening",
  next_lessons_focus: "Continue travel and tourism",
  writing_practice: "Travel writing",
  home_learning_task: "1st / 2nd conditional grammar practice",
  notes: "Good participation",
  even_better_if: "Develop phrases of fluency",
  summary: "Tourism: speaking and listening",
  homework: "1st / 2nd conditional grammar practice",
  additional_notes: "Good participation",
  status: "SENT",
  created_at: "2026-09-13T13:00:00.000Z",
  updated_at: "2026-09-13T13:01:00.000Z",
  sent_at: "2026-09-13T13:02:00.000Z"
};

describe("structured lesson reports", () => {
  it("projects persisted snapshot data consistently", () => {
    const view = reportViewModel(report);
    expect(view.lessonDate).toBe("13/09/2026");
    expect(view.lessonTime).toBe("13:00–13:55");
    expect(view.pupilName).toBe("Brian");
    expect(view.level).toBe("ESOL N5/H");
    expect(view.evenBetterIf).toContain("fluency");
  });

  it("generates a genuine PDF containing the report structure", () => {
    const pdf = generateLessonReportPdf(reportViewModel(report));
    const text = new TextDecoder().decode(pdf);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("Tutorial Feedback");
    expect(text).toContain("This Lesson's Focus");
    expect(text).toContain("Home Learning Task");
    expect(text).toContain("Brian");
    expect(text).toContain("ESOL N5/H");
  });
});
