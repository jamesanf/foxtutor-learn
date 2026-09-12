import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const workerSource = readFileSync("src/worker/index.ts", "utf8");
const clientSource = readFileSync("src/client/learn.ts", "utf8");
const cssSource = readFileSync("public/learn.css", "utf8");

describe("calendar presentation contract", () => {
  it("uses a week-first TimeGrid toolbar with a secondary month view", () => {
    expect(clientSource).toContain('initialView: "timeGridWeek"');
    expect(clientSource).toContain('right: "timeGridWeek,dayGridMonth"');
    expect(clientSource).toContain('buttonText: { today: "Today", month: "Month", week: "Week" }');
    expect(clientSource).toContain("left: \"prev,today,next\"");
    expect(clientSource).toContain('aria-label", `Previous ${period}`');
    expect(clientSource).toContain('slotMinTime: "09:00:00"');
    expect(clientSource).toContain('slotMaxTime: "21:00:00"');
    expect(clientSource).toContain('scrollTime: "09:00:00"');
    expect(clientSource).toContain('height: "clamp(560px, calc(100vh - 230px), 760px)"');
    expect(clientSource).toContain('titleFormat: { day: "numeric", month: "long", year: "numeric" }');
    expect(clientSource).toContain('import timeGridPlugin from "@fullcalendar/timegrid"');
    expect(clientSource).not.toContain("window.confirm");
  });

  it("renders only the authorized event projection and removes per-day add controls", () => {
    expect(workerSource).toContain("data-calendar-events=");
    expect(workerSource).toContain("const lessons = await listLessonsForUser(db, active.user.id);");
    expect(workerSource).not.toContain("calendar-add");
    expect(workerSource).not.toContain("calendar-empty");
    expect(workerSource).toContain("STANDARD_LESSON_DURATION_MINUTES");
    expect(workerSource).toContain('name="startTime"');
    expect(workerSource).toContain('name="lessonDate"');
    expect(workerSource).toContain("data-confirmation");
    expect(workerSource).not.toContain("data-confirm=");
    expect(workerSource).toContain("/learn/admin/bookings");
    expect(workerSource).toContain("listUpcomingLessons");
    expect(cssSource).toContain(".table-wrap table, .table-wrap tbody, .table-wrap tr, .table-wrap td");
    expect(cssSource).not.toContain("table, tbody, tr, td { display: block; }");
  });

  it("uses a native quarter-hour time input and a date-independent end preview", () => {
    expect(workerSource).toContain('type="time" name="startTime"');
    expect(workerSource).toContain('step="900"');
    expect(workerSource).not.toContain('name="startTime"><option');
    expect(workerSource).not.toContain("timeOptions(");
    expect(clientSource).toContain('time.type !== "time"');
    expect(clientSource).toContain('time.addEventListener("input", updateEndPreview)');
    expect(clientSource).not.toContain('date.addEventListener("input", updateEndPreview)');
    expect(clientSource).toContain("totalMinutes");
  });

  it("renders visible inline navigation icons and an application confirmation surface", () => {
    expect(clientSource).toContain("setCalendarNavigationIcon");
    expect(clientSource).toContain('createElementNS(svgNamespace, "svg")');
    expect(clientSource).toContain("calendar-nav-icon");
    expect(workerSource).toContain('role="alertdialog"');
    expect(workerSource).toContain('aria-modal="true"');
    expect(workerSource).toContain("subscription-link-group");
  });

  it("keeps event labels concise and renders a single admin bookings destination", () => {
    expect(workerSource).toContain("extendedProps: { displayTime, status");
    expect(clientSource).toContain("lesson-event-title");
    expect(clientSource).toContain("lesson-event-time");
    expect(workerSource).toContain('["/learn/admin/bookings", "Bookings"]');
  });
});
