import { isoToLocalDateTime, localDateTimeToIso } from "./validation";

export const CALENDAR_TIMEZONE = "Europe/London";

export interface CalendarPeriod {
  startDate: string;
  endDate: string;
  dates: string[];
  startAt: string;
  endAt: string;
  timezone: string;
}

function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function addDays(value: string, amount: number): string {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function currentCalendarDate(now = new Date(), timezone = CALENDAR_TIMEZONE): string {
  return isoToLocalDateTime(now.toISOString(), timezone).slice(0, 10);
}

export function calendarPeriod(dateInput: string | null | undefined, timezone = CALENDAR_TIMEZONE): CalendarPeriod {
  const requestedDate = dateInput && validIsoDate(dateInput) ? dateInput : currentCalendarDate(new Date(), timezone);
  const weekday = new Date(`${requestedDate}T12:00:00.000Z`).getUTCDay();
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  const startDate = addDays(requestedDate, -daysSinceMonday);
  const dates = Array.from({ length: 7 }, (_, index) => addDays(startDate, index));
  const endDate = addDays(startDate, 7);
  const start = localDateTimeToIso(`${startDate}T00:00`, timezone);
  const end = localDateTimeToIso(`${endDate}T00:00`, timezone);
  if (!start.value || !end.value) throw new Error("Calendar timezone must be valid.");
  return { startDate, endDate, dates, startAt: start.value, endAt: end.value, timezone };
}

export function previousCalendarWeek(period: CalendarPeriod): string {
  return addDays(period.startDate, -7);
}

export function nextCalendarWeek(period: CalendarPeriod): string {
  return addDays(period.startDate, 7);
}

export function lessonCalendarDate(startAt: string, calendarTimezone: string): string {
  return isoToLocalDateTime(startAt, calendarTimezone).slice(0, 10);
}

export function calendarDateLabel(date: string, timezone = CALENDAR_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: timezone
  }).format(new Date(`${date}T12:00:00.000Z`));
}

export function calendarPeriodLabel(period: CalendarPeriod): string {
  const formatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: period.timezone });
  const start = formatter.format(new Date(`${period.startDate}T12:00:00.000Z`));
  const end = formatter.format(new Date(`${period.dates[period.dates.length - 1]}T12:00:00.000Z`));
  return `${start} - ${end}`;
}
