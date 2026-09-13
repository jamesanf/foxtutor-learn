const UK_TIMEZONE = "Europe/London";

export type ClockChangeDirection = "forward" | "backward";

interface LocalDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
}

function localDateParts(instant: string | Date): LocalDateParts | null {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(instant));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);
  const hour = Number(values.hour);
  if (![year, month, day, hour].every(Number.isFinite)) return null;
  return { year, month, day, hour };
}

function lastSunday(year: number, month: number): number {
  const lastDay = new Date(Date.UTC(year, month, 0));
  return lastDay.getUTCDate() - lastDay.getUTCDay();
}

export function clockChangeForDate(year: number, month: number, day: number): ClockChangeDirection | null {
  if (month === 3 && day === lastSunday(year, 3)) return "forward";
  if (month === 10 && day === lastSunday(year, 10)) return "backward";
  return null;
}

export function dstWarningForInstant(instant: string | Date): {
  localDate: string;
  direction: ClockChangeDirection;
} | null {
  const parts = localDateParts(instant);
  if (!parts || parts.hour !== 9) return null;
  const direction = clockChangeForDate(parts.year, parts.month, parts.day);
  if (!direction) return null;
  const localDate = `${parts.year.toString().padStart(4, "0")}-${parts.month.toString().padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
  return { localDate, direction };
}
