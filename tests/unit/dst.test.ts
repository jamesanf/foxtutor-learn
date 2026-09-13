import { describe, expect, it } from "vitest";
import { clockChangeForDate, dstWarningForInstant } from "../../src/domain/dst";

describe("UK daylight-saving reminders", () => {
  it("identifies the last Sunday clock changes", () => {
    expect(clockChangeForDate(2026, 3, 29)).toBe("forward");
    expect(clockChangeForDate(2026, 10, 25)).toBe("backward");
    expect(clockChangeForDate(2026, 3, 28)).toBeNull();
  });

  it("opens the reminder window at 9am UK time on the change date", () => {
    expect(dstWarningForInstant("2026-03-29T08:00:00.000Z")).toEqual({
      localDate: "2026-03-29",
      direction: "forward"
    });
    expect(dstWarningForInstant("2026-10-25T09:00:00.000Z")).toEqual({
      localDate: "2026-10-25",
      direction: "backward"
    });
    expect(dstWarningForInstant("2026-03-28T09:00:00.000Z")).toBeNull();
  });
});
