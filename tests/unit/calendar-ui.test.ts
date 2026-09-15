import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const workerSource = readFileSync("src/worker/index.ts", "utf8");
const clientSource = readFileSync("src/client/learn.ts", "utf8");
const cssSource = readFileSync("public/learn.css", "utf8");

function contrastRatio(foreground: [number, number, number], background: [number, number, number]): number {
  const luminance = (rgb: [number, number, number]) => {
    const channels = rgb.map((channel) => channel / 255).map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

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
    expect(clientSource).toContain("expandRows: false");
    expect(clientSource).toContain('height: "auto"');
    expect(clientSource).toContain("fixedWeekCount: false");
    expect(clientSource).toContain('titleFormat: { day: "numeric", month: "long", year: "numeric" }');
    expect(clientSource).toContain('import timeGridPlugin from "@fullcalendar/timegrid"');
    expect(clientSource).not.toContain("window.confirm");
    expect(cssSource).not.toMatch(/\.calendar[^{}]*\{[^}]*min-height:\s*(?:[6-9]\d\d|\d{4,})px/);
    expect(cssSource).not.toContain("clamp(560px");
  });

  it("renders only the authorized event projection and removes per-day add controls", () => {
    expect(workerSource).toContain("data-calendar-events=");
    expect(workerSource).toContain("const lessons = await listLessonsForUser(db, active.user.id);");
    expect(workerSource).not.toContain("calendar-add");
    expect(workerSource).not.toContain("calendar-empty");
    expect(workerSource).toContain("STANDARD_LESSON_DURATION_MINUTES");
    expect(workerSource).toContain('name="startTime"');
    expect(workerSource).toContain('name="lessonDate"');
    expect(workerSource).not.toContain("data-confirmation");
    expect(workerSource).not.toContain("data-confirm-submit");
    expect(workerSource).toContain("/learn/admin/bookings");
    expect(workerSource).toContain("listUpcomingLessons");
    expect(cssSource).toContain(".table-wrap { overflow-x: auto; border: 1px solid #c3d0dc; background: var(--surface); }");
    expect(cssSource).toContain(".table-wrap table { display: table; width: max-content; min-width: 100%; table-layout: auto; }");
    expect(cssSource).toContain(".table-wrap thead { position: static; width: auto; height: auto; overflow: visible;");
    expect(cssSource).not.toContain(".table-wrap table, .table-wrap tbody, .table-wrap tr, .table-wrap td { display: block; }");
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

  it("renders visible inline navigation icons and a one-click subscription action", () => {
    expect(clientSource).toContain("setCalendarNavigationIcon");
    expect(clientSource).toContain('createElementNS(svgNamespace, "svg")');
    expect(clientSource).toContain("calendar-nav-icon");
    expect(workerSource).toContain("subscription-panel");
    expect(cssSource).toContain(".subscription-content { display: grid");
    expect(workerSource).toContain("data-calendar-subscription");
    expect(workerSource).toContain("data-calendar-regenerate");
    expect(workerSource).toContain("data-calendar-feed-link");
    expect(workerSource).toContain("Calendar link regenerated");
    expect(workerSource).not.toContain("Private calendar link");
    expect(workerSource).not.toContain("An active link exists");
    expect(workerSource).not.toContain("Regenerating replaces");
    expect(clientSource).toContain("X-Calendar-Fragment");
    expect(clientSource).toContain("showNotification");
    expect(workerSource).toContain('id="site-notifications"');
    expect(clientSource).toContain("site-notification-close");
    expect(clientSource).toContain('type === "error"');
    expect(clientSource).toContain("container.replaceChildren()");
    expect(cssSource).toContain(".site-notifications { position: fixed; bottom: max(16px, env(safe-area-inset-bottom)); left: 50%");
    expect(cssSource).toContain("transform: translateX(-50%)");
    expect(cssSource).toContain("border-radius: 999px");
    expect(cssSource).toContain("background: color-mix(in srgb, var(--action) 90%, transparent)");
    expect(cssSource).toContain("box-shadow: none");
    expect(cssSource).not.toContain(".site-notification-error");
    expect(cssSource).not.toContain("top: 50%; left: 50%");
  });

  it("keeps event labels concise and renders a single admin bookings destination", () => {
    expect(workerSource).toContain("extendedProps: { displayTime, status");
    expect(clientSource).toContain("lesson-event-title");
    expect(clientSource).toContain("lesson-event-time");
    expect(workerSource).toContain('["/learn/admin/bookings", "Bookings"]');
    expect(workerSource).toContain('["/learn/admin/lessons", "Past Lessons"]');
    expect(workerSource).not.toContain('["/learn/admin/lessons", "Lessons"]');
    expect(workerSource).not.toContain(">Rows<");
  });

  it("places recurring-series administration below bookings without a separate tab", () => {
    expect(workerSource).toContain("function recurringSeriesSection(");
    expect(workerSource).toContain('`${lessonList(bookings, total, safePage, pageSize');
    expect(workerSource).toContain("${recurringSeriesSection(series, students, csrfToken, safeSeriesPage, seriesPagination.pageSize, seriesTotal)}");
    expect(workerSource).toContain('parseStudentSectionPagination(url, "seriesPage", "seriesSize")');
    expect(workerSource).toContain('listRecurringSeriesPage(db, seriesPagination.pageSize, (safeSeriesPage - 1) * seriesPagination.pageSize)');
    expect(workerSource).toContain('studentSectionPagination(page, pageSize, total, "/learn/admin/bookings", "Recurring lesson series", "seriesPage", "seriesSize")');
    expect(workerSource).toContain('<section class="recurring-series-section">');
    expect(workerSource).not.toContain('<section class="card recurring-series-section">');
    expect(cssSource).toContain(".recurring-series-section { margin-top: 28px; }");
    expect(workerSource).toContain('lessonCreateDialog(csrfToken, students, initialBookingView)');
    expect(workerSource).toContain('data-lesson-create-trigger');
    expect(workerSource).toContain('New Booking');
    expect(workerSource).toContain('data-booking-option="standalone"');
    expect(workerSource).toContain('data-booking-option="recurring"');
    expect(workerSource).toContain('class="booking-dialog-back"');
    expect(workerSource).toContain('aria-label="Back to booking type"');
    expect(workerSource).toContain('M20 11H7.83l5.59-5.59');
    expect(workerSource).not.toContain('class="button secondary booking-dialog-back"');
    expect(cssSource).toContain(".booking-dialog-back { display: inline-grid;");
    expect(cssSource).toContain("border: 0;");
    expect(workerSource).toContain('recurringSeriesFormMarkup(csrfToken, students, undefined, true)');
    expect(workerSource).toContain('if (request.method === "GET") return redirect("/learn/admin/bookings?open=recurring");');
    expect(workerSource).toContain('async function adminDashboard(user: AppUser, csrfToken: string, db: D1Database)');
    expect(workerSource).toContain('return appPage(user, csrfToken, "Dashboard"');
    expect(workerSource).toContain('${lessonCreateDialog(csrfToken, students)}');
    expect(workerSource).not.toContain('["/learn/admin/series", "Recurring series"]');
    expect(workerSource).toContain('if (route === "admin-series")');
    expect(workerSource).toContain('return redirect("/learn/admin/bookings");');
  });

  it("aligns recurring-series table actions with the Action header", () => {
    expect(workerSource).toContain('<td class="table-action-cell">${item.status === "ACTIVE"');
    expect(cssSource).toContain(".table-action-cell { vertical-align: middle; text-align: left; }");
    expect(cssSource).toContain(".table-action-cell form { display: flex; height: 100%; align-items: center; justify-content: flex-start; margin: 0; }");
    expect(cssSource).toContain(".table-action-cell .button { margin-top: 0; }");
    expect(cssSource).toContain(".recurring-series-action { min-height: 24px; height: 24px;");
    expect(cssSource.indexOf(".button {")).toBeLessThan(cssSource.indexOf(".recurring-series-action {"));
    expect(workerSource).toContain('class="button secondary recurring-series-action"');
  });

  it("keeps every lesson status above the normal-text contrast threshold", () => {
    const white: [number, number, number] = [255, 255, 255];
    const statusColours: Record<string, [number, number, number]> = {
      scheduled: [22, 101, 52],
      completed: [7, 89, 133],
      cancelled: [153, 27, 27]
    };
    for (const [status, background] of Object.entries(statusColours)) {
      expect(contrastRatio(white, background), status).toBeGreaterThanOrEqual(4.5);
      expect(cssSource).toContain(`.lesson-status-${status}`);
    }
    expect(cssSource).toContain(".calendar-host.fc .fc-event-main");
    expect(cssSource).toContain("color: inherit");
  });

  it("keeps obvious page hierarchy concise", () => {
    expect(workerSource).toContain("<h1>Dashboard</h1>");
    expect(workerSource).toContain("<span>Upcoming Bookings</span>");
    expect(workerSource).toContain("<span>Active Students</span>");
    expect(workerSource).toContain("<span>Next Lesson</span>");
    expect(workerSource).toContain('<strong>${upcoming[0] ? escapeHtml(bookingDate(upcoming[0])) : "None"}</strong>');
    expect(workerSource).toContain('<a class="summary-card" href="/learn/admin/bookings"><span>Upcoming Bookings</span><strong>${upcomingCount}</strong></a>');
    expect(workerSource).toContain('<a class="summary-card" href="/learn/admin/students"><span>Active Students</span><strong>${activeStudents}</strong></a>');
    expect(workerSource).toContain('<a class="summary-card" href="/learn/admin/reschedules"><span>Reschedule requests</span><strong>${rescheduleRequests}</strong></a>');
    expect(workerSource).not.toContain("<small>View bookings</small>");
    expect(workerSource).not.toContain("<small>View students</small>");
    expect(workerSource).not.toContain("<small>View reschedules</small>");
    expect(workerSource).not.toContain("No scheduled lessons");
    expect(workerSource).not.toContain("PRIVATE LEARNING PORTAL");
    expect(workerSource).not.toContain("LESSON SCHEDULE</p><h1>Calendar");
    expect(workerSource).not.toContain("UPCOMING SCHEDULE");
    expect(workerSource).not.toContain("Find teaching material");
  });
});
