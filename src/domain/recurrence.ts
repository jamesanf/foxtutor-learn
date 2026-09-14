export interface RecurringSeriesRule {
  dayOfWeek: number;
  localStartTime: string;
  durationMinutes: number;
  timezone?: string;
  startDate: string;
  endDate?: string | null;
}

export interface RecurrencePause {
  startsOn: string;
  endsOn: string;
}

export interface MaterialisedOccurrence {
  recurrenceKey: string;
  startAt: string;
  endAt: string;
}

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Recurrence dates must be ISO calendar dates.");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (parsed.toISOString().slice(0, 10) !== value) throw new Error("Recurrence dates must be valid ISO calendar dates.");
  return parsed;
}

function dateText(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function addCalendarDays(date: string, days: number): string {
  const parsed = parseDate(date);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return dateText(parsed);
}

export function compareCalendarDates(left: string, right: string): number {
  return parseDate(left).getTime() - parseDate(right).getTime();
}

export function isDatePaused(date: string, pauses: readonly RecurrencePause[]): boolean {
  return pauses.some((pause) => compareCalendarDates(pause.startsOn, date) <= 0 && compareCalendarDates(date, pause.endsOn) <= 0);
}

function localPartsAt(timestamp: number, timezone: string): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour === "24" ? "00" : values.hour),
    minute: Number(values.minute),
    second: Number(values.second)
  };
}

export function zonedDateTimeToUtc(localDate: string, localTime: string, timezone: string): string {
  if (timezone !== FOX_TUTOR_TIMEZONE) throw new Error(`FoxTutor lessons always use ${FOX_TUTOR_TIMEZONE}.`);
  parseDate(localDate);
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(localTime);
  if (!match) throw new Error("Recurring lesson time must be HH:MM.");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const [year, month, day] = localDate.split("-").map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let candidate = localAsUtc;
  for (let index = 0; index < 3; index += 1) {
    const parts = localPartsAt(candidate, timezone);
    const renderedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    candidate += localAsUtc - renderedAsUtc;
  }
  return new Date(candidate).toISOString();
}

export function recurringOccurrencesInWindow(
  rule: RecurringSeriesRule,
  windowStart: string,
  windowEnd: string,
  pauses: readonly RecurrencePause[] = []
): MaterialisedOccurrence[] {
  if (!Number.isInteger(rule.dayOfWeek) || rule.dayOfWeek < 0 || rule.dayOfWeek > 6) {
    throw new Error("Recurring lesson day must be between Sunday and Saturday.");
  }
  if (rule.timezone && rule.timezone !== FOX_TUTOR_TIMEZONE) {
    throw new Error(`FoxTutor lessons always use ${FOX_TUTOR_TIMEZONE}.`);
  }
  if (!Number.isInteger(rule.durationMinutes) || rule.durationMinutes < 1 || rule.durationMinutes > 1440) {
    throw new Error("Recurring lesson duration is invalid.");
  }
  parseDate(windowStart);
  parseDate(windowEnd);
  const firstDate = compareCalendarDates(rule.startDate, windowStart) > 0 ? rule.startDate : windowStart;
  const lastDate = rule.endDate && compareCalendarDates(rule.endDate, windowEnd) < 0 ? rule.endDate : windowEnd;
  if (compareCalendarDates(firstDate, lastDate) > 0) return [];
  const result: MaterialisedOccurrence[] = [];
  let date = firstDate;
  while (compareCalendarDates(date, lastDate) <= 0) {
    const weekday = parseDate(date).getUTCDay();
    if (weekday === rule.dayOfWeek && !isDatePaused(date, pauses)) {
      const startAt = zonedDateTimeToUtc(date, rule.localStartTime, FOX_TUTOR_TIMEZONE);
      const endAt = new Date(Date.parse(startAt) + rule.durationMinutes * 60_000).toISOString();
      result.push({ recurrenceKey: date, startAt, endAt });
    }
    date = addCalendarDays(date, 1);
  }
  return result;
}

export function sixWeekWindow(today: string): { startDate: string; endDate: string } {
  parseDate(today);
  return { startDate: today, endDate: addCalendarDays(today, 42) };
}
import { FOX_TUTOR_TIMEZONE } from "./calendar";
