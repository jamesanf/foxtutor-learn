import { describe, expect, it } from "vitest";
import { generateLessonReportPdf } from "../../src/reports/pdf";
import { renderRichTextHtml, richTextToPlainText } from "../../src/reports/rich-text";
import { reportViewModel } from "../../src/reports/view";
import type { LessonReport } from "../../src/db/reports";
import { findSentLessonReportForStudent, markLessonReportSent } from "../../src/db/reports";

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
  it("qualifies report columns across the student ownership joins", async () => {
    let query = "";
    const statement = {
      bind() {
        return statement;
      },
      first() {
        return Promise.resolve(report);
      }
    };
    const db = {
      prepare(sql: string) {
        query = sql;
        return statement;
      }
    } as unknown as D1Database;
    await expect(findSentLessonReportForStudent(db, "lesson-1", "student-user-1")).resolves.toEqual(report);
    expect(query).toContain("SELECT r.id, r.lesson_id");
    expect(query).toContain("r.status = 'SENT'");
  });

  it("refreshes sent_at when a draft or already-sent report is delivered", async () => {
    let query = "";
    const statement = {
      bind() {
        return statement;
      },
      run() {
        return Promise.resolve({ success: true });
      }
    };
    const db = {
      prepare(sql: string) {
        query = sql;
        return statement;
      }
    } as unknown as D1Database;
    await markLessonReportSent(db, "report-1", "2026-09-13T15:30:00.000Z");
    expect(query).toContain("status IN ('DRAFT', 'SENT')");
  });

  it("projects persisted snapshot data consistently", () => {
    const view = reportViewModel(report);
    expect(view.lessonDate).toBe("13/09/2026");
    expect(view.lessonTime).toBe("1PM");
    expect(view.pupilName).toBe("Brian");
    expect(view.level).toBe("ESOL N5/H");
    expect(view.evenBetterIf).toContain("fluency");
    expect("writingPractice" in view).toBe(false);
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
    expect((text.match(/\/Type \/Page\b/g) ?? []).length).toBe(1);
    const brandedPdf = new TextDecoder().decode(generateLessonReportPdf(reportViewModel(report), {
      logo: {
        width: 2,
        height: 2,
        rgb: Uint8Array.from([0x78, 0x9c, 0x63, 0x60, 0x64, 0x62, 0x06, 0x00, 0x00, 0x0b, 0x00, 0x05]),
        alpha: Uint8Array.from([0x78, 0x9c, 0x63, 0x60, 0x60, 0x60, 0x00, 0x00, 0x00, 0x04, 0x00, 0x01])
      },
      reportUrl: "https://foxtutor.org/learn/student/lessons/lesson-1/report"
    }));
    expect(brandedPdf).toContain("/Subtype /Image");
    expect(brandedPdf).toContain("/ColorSpace /DeviceGray");
    expect(brandedPdf).toContain("/SMask");
    expect(brandedPdf).toContain("/Filter /FlateDecode");
    expect(brandedPdf).toContain("/Im1 Do");
    expect(brandedPdf).toContain("Lesson Report");
    expect(brandedPdf).toContain("10.5 Tf");
    expect(brandedPdf).toContain("View this report on FoxTutor Learn");
    expect(brandedPdf).toContain("/Subtype /Link");
    expect(brandedPdf).toContain("/S /URI");
    expect(brandedPdf).not.toContain("Page 1 of 1");
    expect(brandedPdf).toContain(`${new Date().getFullYear()} Fox Learning Ltd. All rights reserved.`);
  });

  it("renders numbered and bulleted report content safely", () => {
    const value = "1. **First step**\n2) ==Second step==\n\n- Final step";
    expect(renderRichTextHtml(value)).toContain("<ol><li><strong>First step</strong></li><li><mark class=\"report-highlight\">Second step</mark></li></ol>");
    expect(renderRichTextHtml(value)).toContain("<ul><li>Final step</li></ul>");
    expect(richTextToPlainText(value)).toContain("1. First step");
    expect(richTextToPlainText(value)).toContain("2) Second step");
    expect(richTextToPlainText("- - great work!")).toBe("• great work!");
  });
});
