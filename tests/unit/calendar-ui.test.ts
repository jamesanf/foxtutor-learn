import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const workerSource = readFileSync("src/worker/index.ts", "utf8");
const clientSource = readFileSync("src/client/learn.ts", "utf8");

describe("calendar presentation contract", () => {
  it("uses a month-first FullCalendar toolbar with an optional week view", () => {
    expect(clientSource).toContain('initialView: "dayGridMonth"');
    expect(clientSource).toContain('right: "dayGridMonth,dayGridWeek"');
    expect(clientSource).toContain('buttonText: { today: "Today", month: "Month", week: "Week" }');
    expect(clientSource).toContain("left: \"prev,today,next\"");
  });

  it("renders only the authorized event projection and removes per-day add controls", () => {
    expect(workerSource).toContain("data-calendar-events=");
    expect(workerSource).toContain("const lessons = await listLessonsForUser(db, active.user.id);");
    expect(workerSource).not.toContain("calendar-add");
    expect(workerSource).not.toContain("calendar-empty");
  });
});
