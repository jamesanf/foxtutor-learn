import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const workerSource = readFileSync("src/worker/index.ts", "utf8");
const cssSource = readFileSync("public/learn.css", "utf8");

describe("student profile form UI", () => {
  it("requires only pupil name and pupil email in the form", () => {
    expect(workerSource).toContain("Pupil name<input type=\"text\" name=\"name\"");
    expect(workerSource).toContain("name=\"email\" value=");
  });

  it("shows the Direct Debit mandate state in the admin student detail", () => {
    expect(workerSource).toContain("<strong>Direct Debit mandate</strong>");
    expect(workerSource).toContain("billingAccount?.mandate_state");
    expect(workerSource).toContain("Open FreeAgent mandate request");
    expect(workerSource).toContain("Student created.");
    expect(workerSource).toContain("required autocomplete=\"email\"");
    expect(workerSource).toContain("name=\"parentName\"");
    expect(workerSource).toContain("name=\"parentEmail\"");
  });

  it("uses the internal tooltip treatment and hides irrelevant academic years", () => {
    expect(workerSource).toContain("data-tooltip=\"${safeText}\"");
    expect(workerSource).not.toContain('title="${safeText}"');
    expect(workerSource).toContain("data-academic-year-field");
    expect(workerSource).toContain("dynamicAcademicSystem");
    expect(cssSource).toContain("content: attr(data-tooltip)");
    expect(cssSource).toContain(".student-form-grid");
  });

  it("provides a privacy-safe Direct Debit status and setup journey", () => {
    const billingSource = workerSource.slice(
      workerSource.indexOf("async function studentBillingPage"),
      workerSource.indexOf("async function handleStudent")
    );
    expect(billingSource).toContain("<h2 id=\"direct-debit-heading\">Direct Debit</h2>");
    expect(billingSource).toContain("secure provider flow");
    expect(billingSource).toContain("in FoxTutor Learn");
    expect(billingSource).toContain("Contact billing");
    expect(billingSource).toContain("mailto:billing@foxtutor.org");
    expect(billingSource).toContain(">billing@foxtutor.org</a>");
    expect(billingSource).not.toContain("provider reference</th>");
    expect(billingSource).not.toContain("source_event_id");
    expect(billingSource).not.toMatch(/PAYG|pay as you go|choose how to pay|payment method/i);
  });

  it("keeps the student billing summary focused and evenly balanced", () => {
    const billingSource = workerSource.slice(
      workerSource.indexOf("async function studentBillingPage"),
      workerSource.indexOf("async function handleStudent")
    );
    expect(billingSource).toContain('class="summary-grid student-billing-summary"');
    expect(billingSource).not.toContain("<span>Billing rail</span>");
    expect(billingSource).not.toContain("<small>${escapeHtml(mandateCopy.label)}</small>");
    expect(cssSource).toContain(".student-billing-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }");
    expect(cssSource).toContain(".student-billing-summary .summary-card { min-height: 112px; grid-template-rows: 1fr auto 1fr; align-items: center; }");
    expect(cssSource).toContain(".student-billing-summary .summary-card span { align-self: end; }");
    expect(cssSource).toContain(".student-billing-summary .summary-card small { align-self: start; min-height: 1.2em; }");
  });

  it("provides recurring lesson management and invoice links", () => {
    expect(workerSource).toContain("View series and scheduled lessons");
    expect(workerSource).toContain("Cancel just this lesson");
    expect(workerSource).toContain("Cancel this and all future lessons");
    expect(workerSource).toContain("data-series-cancel-trigger");
    expect(workerSource).toContain("What would you like to do?");
    expect(workerSource).toContain("Lessons cannot be cancelled within 24 hours of their start.");
    expect(workerSource).toContain("This lesson cannot be cancelled within 24 hours of its start.");
    expect(workerSource).toContain("compactUuidKey(series.id)");
    expect(workerSource).toContain("View/download invoice");
    expect(workerSource).toContain("mode: \"THIS_AND_FUTURE\"");
  });

  it("does not expose report creation actions in the student lesson list", () => {
    expect(workerSource).toContain("function lessonTable(lessons: Lesson[], basePath: string, showStudent: boolean, studentViewer = false)");
    expect(workerSource).toContain("? \"\"");
    expect(workerSource).toContain('lessonTable(upcoming, "/learn/student/lessons", false, true)');
    expect(workerSource).toContain('lessonTable(past, "/learn/student/lessons", false, true)');
  });

  it("uses independent standard pagination for upcoming and past lessons", () => {
    expect(workerSource).toContain('parseStudentSectionPagination(url, "upcomingPage", "upcomingSize")');
    expect(workerSource).toContain('parseStudentSectionPagination(url, "pastPage", "pastSize")');
    expect(workerSource).toContain('studentSectionPagination(upcomingPage, upcomingPagination.pageSize, upcomingTotal');
    expect(workerSource).toContain('studentSectionPagination(pastPage, pastPagination.pageSize, pastTotal');
    expect(workerSource).toContain('listUpcomingLessonsForUser');
    expect(workerSource).toContain('listPastLessonsForUser');
  });

  it("keeps the student lesson-detail heading compact", () => {
    expect(workerSource).toContain('class="page-heading student-lesson-heading"');
    expect(workerSource).toContain('class="student-lesson-title"');
    expect(cssSource).toContain(".student-lesson-title { font-size: clamp(1.2rem, 2.2vw, 1.6rem);");
  });

  it("shows student dashboard lesson summaries and the latest home learning task", () => {
    expect(workerSource).toContain("Next lesson scheduled");
    expect(workerSource).toContain("Last lesson");
    expect(workerSource).toContain("Home learning");
    expect(workerSource).toContain("None available");
    expect(workerSource).toContain('href="${lastLessonPath}/submit"');
    expect(workerSource).toContain("listUpcomingLessonsForUser(db, user.id, now, 1, 0)");
    expect(workerSource).toContain("findSentLessonReportForStudent(db, lastLesson.id, user.id)");
    expect(cssSource).toContain(".student-dashboard-panels { display: grid;");
  });

  it("provides a secured student home-learning submission route", () => {
    expect(workerSource).toContain('"student-lesson-submit"');
    expect(workerSource).toContain('const action = `/learn/student/lessons/${lessonRouteId(lesson.id)}/submit`;');
    expect(workerSource).toContain("studentAssignmentUploadForm");
    expect(workerSource).toContain("notifyStudent: false");
  });
});
